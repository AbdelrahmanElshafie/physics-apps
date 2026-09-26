import { solveLinearSystem } from './linear'
import type { Battery, Circuit, NodeId, SolveResult, Voltmeter } from './types'
import { UnionFind } from './union-find'

/** An edge the solver actually stamps into the matrix, after wires/switches/batteries are resolved. */
interface ResistorEdge {
  readonly componentId: string
  readonly a: NodeId
  readonly b: NodeId
  readonly ohms: number
}

/** An ideal voltage source between `a` (+) and `b` (-): `V(a) - V(b) = volts`, exactly. */
interface SourceEdge {
  readonly componentId: string
  readonly a: NodeId
  readonly b: NodeId
  readonly volts: number
}

const hiddenNodeFor = (batteryId: string): NodeId => `\0battery-internal:${batteryId}`

/**
 * Solves a DC resistive circuit for every node voltage and branch current.
 *
 * Three passes:
 *  1. Union-find over wires and closed switches — a zero-resistance connection is not a matrix
 *     unknown, it is the *same node* wearing two names.
 *  2. A battery desugars into an ideal source in series with its internal resistance, through one
 *     hidden node the caller never sees — so the rest of the solver only ever deals in resistors
 *     and ideal sources.
 *  3. The remaining graph may not be one connected piece — an open switch can strand part of a
 *     student's circuit. Each connected piece ("island") is solved on its own, with its own local
 *     reference node; only the island actually containing `ground` gets voltages that mean
 *     anything outside that island.
 */
export function solveCircuit(circuit: Circuit): SolveResult {
  const merge = new UnionFind<NodeId>()
  for (const c of circuit.components) {
    if (c.kind === 'wire' || (c.kind === 'switch' && c.closed)) merge.union(c.a, c.b)
  }
  // Every node id that appears anywhere, so an isolated one-terminal mistake still gets a voltage.
  for (const c of circuit.components) {
    merge.find(c.a)
    merge.find(c.b)
  }
  merge.find(circuit.ground)
  const rep = (n: NodeId): NodeId => merge.find(n)
  const groundRep = rep(circuit.ground)

  const resistors: ResistorEdge[] = []
  const sources: SourceEdge[] = []
  const voltmeters: (Voltmeter & { readonly repA: NodeId; readonly repB: NodeId })[] = []

  for (const c of circuit.components) {
    switch (c.kind) {
      case 'wire':
      case 'switch':
        // Closed: absorbed into the union-find above. Open: simply not a connection.
        break
      case 'resistor':
        resistors.push({ componentId: c.id, a: rep(c.a), b: rep(c.b), ohms: c.ohms })
        break
      case 'battery':
        desugarBattery(c, rep, resistors, sources)
        break
      case 'ammeter':
        // An ideal ammeter is a 0 V source: it forces V(a) = V(b), same as a wire, but — unlike a
        // wire — it stays a distinct branch so its current is a solvable unknown instead of being
        // absorbed away by the union-find.
        sources.push({ componentId: c.id, a: rep(c.a), b: rep(c.b), volts: 0 })
        break
      case 'voltmeter':
        voltmeters.push({ ...c, repA: rep(c.a), repB: rep(c.b) })
        break
    }
  }

  // Islands: connected components of the resistor/source graph. A node touched by nothing but a
  // voltmeter forms its own singleton island — there is nothing to solve, its voltage is 0 by
  // convention (nothing it could be measured against inside that island either).
  const islands = new UnionFind<NodeId>()
  for (const e of [...resistors, ...sources]) islands.union(e.a, e.b)
  for (const n of merge.members().map(rep)) islands.find(n)

  const islandIds = new Map<NodeId, number>()
  let nextIslandId = 0
  for (const n of new Set(islands.members().map((n) => islands.find(n)))) {
    islandIds.set(n, nextIslandId)
    nextIslandId += 1
  }
  const islandOf = new Map<NodeId, number>()
  for (const n of islands.members()) islandOf.set(n, islandIds.get(islands.find(n))!)

  const nodeVoltage = new Map<NodeId, number>()
  const current = new Map<string, number>()
  const voltage = new Map<string, number>()

  // A resistor whose two ends were merged into the same node by a wire or a closed switch is
  // shorted: exactly 0 V across it, by definition, and the island solver never sees it (it
  // filters out degenerate a === b edges, since they contribute nothing to the matrix).
  for (const r of resistors) {
    if (r.a === r.b) {
      current.set(r.componentId, 0)
      voltage.set(r.componentId, 0)
    }
  }

  const byIsland = new Map<number, NodeId[]>()
  for (const [node, id] of islandOf) {
    const list = byIsland.get(id) ?? []
    list.push(node)
    byIsland.set(id, list)
  }

  for (const nodes of byIsland.values()) {
    const local = nodes.includes(groundRep) ? groundRep : nodes[0]!
    const result = solveIsland(nodes, local, resistors, sources)
    if (!result.ok) return result
    for (const [n, v] of result.nodeVoltage) nodeVoltage.set(n, v)
    for (const [cid, i] of result.current) current.set(cid, i)
    for (const [cid, v] of result.voltage) voltage.set(cid, v)
  }

  // A battery's own current is read off its internal resistor edge rather than its source edge:
  // the two carry the same current by series conservation, and the resistor edge's sign is
  // unambiguous (defined purely by ohms and the two node voltages) where the source edge's is a
  // solver-internal artefact of how the constraint row was stamped.
  for (const c of circuit.components) {
    if (c.kind !== 'battery') continue
    const hidden = hiddenNodeFor(c.id)
    const va = nodeVoltage.get(rep(c.a))
    const vh = nodeVoltage.get(hidden)
    const r = c.internalOhms ?? 0
    if (va !== undefined && vh !== undefined && r > 0) {
      current.set(c.id, (va - vh) / r)
    }
    // r === 0: current already set from the source-edge auxiliary unknown by solveIsland, under
    // the id `${c.id}:source` — surface it under the battery's own id instead.
    else if (current.has(`${c.id}:source`)) {
      current.set(c.id, current.get(`${c.id}:source`)!)
    }
    voltage.set(c.id, (nodeVoltage.get(rep(c.a)) ?? 0) - (nodeVoltage.get(rep(c.b)) ?? 0))
  }

  for (const vm of voltmeters) {
    const va = nodeVoltage.get(vm.repA)
    const vb = nodeVoltage.get(vm.repB)
    const sameIsland = islandOf.get(vm.repA) === islandOf.get(vm.repB)
    voltage.set(vm.id, va !== undefined && vb !== undefined && sameIsland ? va - vb : NaN)
  }

  return { ok: true, nodeVoltage, islandOf, current, voltage }
}

function desugarBattery(
  c: Battery,
  rep: (n: NodeId) => NodeId,
  resistors: ResistorEdge[],
  sources: SourceEdge[],
): void {
  const r = c.internalOhms ?? 0
  if (r <= 0) {
    // No internal resistance: an ideal source directly between the two terminals.
    sources.push({ componentId: c.id, a: rep(c.a), b: rep(c.b), volts: c.volts })
    return
  }
  const hidden = hiddenNodeFor(c.id)
  // a --[r]-- hidden --[ideal source, hidden is +]-- b
  resistors.push({ componentId: `${c.id}:internal`, a: rep(c.a), b: hidden, ohms: r })
  sources.push({ componentId: `${c.id}:source`, a: hidden, b: rep(c.b), volts: c.volts })
}

interface IslandResult {
  readonly ok: true
  readonly nodeVoltage: Map<NodeId, number>
  readonly current: Map<string, number>
  readonly voltage: Map<string, number>
}

/** Solves one connected island with `local` pinned to V = 0. */
function solveIsland(
  nodes: NodeId[],
  local: NodeId,
  allResistors: ResistorEdge[],
  allSources: SourceEdge[],
): IslandResult | { ok: false; error: string } {
  const nodeSet = new Set(nodes)
  const resistors = allResistors.filter((e) => nodeSet.has(e.a) && nodeSet.has(e.b) && e.a !== e.b)
  const sources = allSources.filter((e) => nodeSet.has(e.a) && nodeSet.has(e.b))

  const unknownNodes = nodes.filter((n) => n !== local)
  const nodeIndex = new Map(unknownNodes.map((n, i) => [n, i]))
  const n = unknownNodes.length
  const m = sources.length
  const size = n + m

  if (size === 0) {
    return { ok: true, nodeVoltage: new Map([[local, 0]]), current: new Map(), voltage: new Map() }
  }

  const A: number[][] = Array.from({ length: size }, () => new Array(size).fill(0))
  const z: number[] = new Array(size).fill(0)

  const idx = (nid: NodeId): number | null => (nid === local ? null : nodeIndex.get(nid) ?? null)

  for (const r of resistors) {
    const g = 1 / r.ohms
    const ia = idx(r.a)
    const ib = idx(r.b)
    if (ia !== null) A[ia]![ia] = A[ia]![ia]! + g
    if (ib !== null) A[ib]![ib] = A[ib]![ib]! + g
    if (ia !== null && ib !== null) {
      A[ia]![ib] = A[ia]![ib]! - g
      A[ib]![ia] = A[ib]![ia]! - g
    }
  }

  sources.forEach((s, k) => {
    const row = n + k
    const ia = idx(s.a)
    const ib = idx(s.b)
    // KCL contribution: current I_k is defined flowing a -> b through the source branch.
    if (ia !== null) {
      A[ia]![row] = A[ia]![row]! + 1
      A[row]![ia] = A[row]![ia]! + 1
    }
    if (ib !== null) {
      A[ib]![row] = A[ib]![row]! - 1
      A[row]![ib] = A[row]![ib]! - 1
    }
    z[row] = s.volts
  })

  const x = solveLinearSystem(A, z)
  if (!x) {
    return {
      ok: false,
      error:
        'This circuit has no unique solution — usually two batteries of different voltage ' +
        'wired straight to the same two points, or an ammeter shorted across a battery.',
    }
  }

  const nodeVoltage = new Map<NodeId, number>([[local, 0]])
  for (const [nid, i] of nodeIndex) nodeVoltage.set(nid, x[i]!)

  const current = new Map<string, number>()
  const voltage = new Map<string, number>()

  for (const r of resistors) {
    const va = nodeVoltage.get(r.a) ?? 0
    const vb = nodeVoltage.get(r.b) ?? 0
    current.set(r.componentId, (va - vb) / r.ohms)
    voltage.set(r.componentId, va - vb)
  }
  sources.forEach((s, k) => {
    // The auxiliary unknown *is* the current flowing a -> b through this ideal source branch.
    current.set(s.componentId, x[n + k]!)
    voltage.set(s.componentId, s.volts)
  })

  return { ok: true, nodeVoltage, current, voltage }
}
