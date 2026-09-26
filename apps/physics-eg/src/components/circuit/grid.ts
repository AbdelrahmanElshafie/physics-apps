import type { Circuit, Component as SimComponent } from '@physics/circuit-sim'

/**
 * A circuit as something you can click together on a breadboard-style dot grid.
 *
 * The grid point *is* the electrical node: two components sharing a point are connected, exactly
 * the way two component legs sharing a breadboard hole are connected. That single rule is what
 * makes "click two dots to place a wire" a correct mental model rather than a simplified one — no
 * separate node-numbering step for a student (or for this code) to get wrong.
 */
export interface GridPoint {
  readonly col: number
  readonly row: number
}

export const keyOf = (p: GridPoint): string => `${p.col},${p.row}`
export const samePoint = (a: GridPoint, b: GridPoint): boolean => a.col === b.col && a.row === b.row

interface Terminals {
  readonly id: string
  readonly a: GridPoint
  readonly b: GridPoint
}

export type PlacedComponent =
  | (Terminals & { readonly kind: 'wire' })
  | (Terminals & { readonly kind: 'resistor'; readonly ohms: number })
  | (Terminals & { readonly kind: 'switch'; readonly closed: boolean })
  | (Terminals & { readonly kind: 'battery'; readonly volts: number; readonly internalOhms: number })
  | (Terminals & { readonly kind: 'ammeter' })
  | (Terminals & { readonly kind: 'voltmeter' })

export const COMPONENT_KINDS = ['wire', 'resistor', 'switch', 'battery', 'ammeter', 'voltmeter'] as const
export type ComponentKind = (typeof COMPONENT_KINDS)[number]

/** Sensible starting value for a freshly placed component of each kind. */
export function defaultComponent(kind: ComponentKind, id: string, a: GridPoint, b: GridPoint): PlacedComponent {
  switch (kind) {
    case 'wire':
      return { id, kind, a, b }
    case 'resistor':
      return { id, kind, a, b, ohms: 10 }
    case 'switch':
      return { id, kind, a, b, closed: true }
    case 'battery':
      return { id, kind, a, b, volts: 10, internalOhms: 0 }
    case 'ammeter':
      return { id, kind, a, b }
    case 'voltmeter':
      return { id, kind, a, b }
  }
}

/**
 * Converts placed components into a solvable circuit. Ground defaults to the first grid point any
 * component touches, so an empty board never needs an explicit ground before it has anything else.
 */
export function toCircuit(components: readonly PlacedComponent[], ground: GridPoint | null): Circuit {
  const resolvedGround = ground ?? components[0]?.a ?? { col: 0, row: 0 }

  const mapped: SimComponent[] = components.map((c) => {
    const a = keyOf(c.a)
    const b = keyOf(c.b)
    switch (c.kind) {
      case 'wire':
        return { kind: 'wire', id: c.id, a, b }
      case 'resistor':
        return { kind: 'resistor', id: c.id, a, b, ohms: c.ohms }
      case 'switch':
        return { kind: 'switch', id: c.id, a, b, closed: c.closed }
      case 'battery':
        return {
          kind: 'battery',
          id: c.id,
          a,
          b,
          volts: c.volts,
          ...(c.internalOhms > 0 ? { internalOhms: c.internalOhms } : {}),
        }
      case 'ammeter':
        return { kind: 'ammeter', id: c.id, a, b }
      case 'voltmeter':
        return { kind: 'voltmeter', id: c.id, a, b }
    }
  })

  return { components: mapped, ground: keyOf(resolvedGround) }
}

/** Every distinct grid point any component currently touches. */
export function pointsInUse(components: readonly PlacedComponent[]): GridPoint[] {
  const seen = new Map<string, GridPoint>()
  for (const c of components) {
    seen.set(keyOf(c.a), c.a)
    seen.set(keyOf(c.b), c.b)
  }
  return [...seen.values()]
}

/**
 * A signed "lane" per component id: 0 for the ordinary case of an edge only one component uses,
 * and evenly spaced fractional values (e.g. -0.5, 0.5 for a pair) when two or more components sit
 * on the exact same pair of grid points — a voltmeter measuring across a resistor, most commonly.
 *
 * Drawing every component on this edge along a straight line through the shared endpoints is what
 * causes one to sit invisibly on top of the other; the canvas uses this value to bow each one's
 * line, and each one's value label, out to its own lane instead. Direction is not part of the key
 * (a-b and b-a are the same edge), since sharing electrical endpoints is symmetric.
 */
export function computeLanes(components: readonly PlacedComponent[]): Map<string, number> {
  const groups = new Map<string, string[]>()
  for (const c of components) {
    const key = [keyOf(c.a), keyOf(c.b)].sort().join('|')
    const list = groups.get(key) ?? []
    list.push(c.id)
    groups.set(key, list)
  }
  const lanes = new Map<string, number>()
  for (const ids of groups.values()) {
    ids.forEach((id, i) => lanes.set(id, i - (ids.length - 1) / 2))
  }
  return lanes
}
