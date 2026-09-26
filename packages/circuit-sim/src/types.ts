/**
 * A DC resistive circuit, as data.
 *
 * Every component names its two terminals by node id — plain strings the caller invents (the
 * canvas UI will use its own junction ids). There is no separate "wire" object graph on top of
 * this: a wire *is* a component, of kind `wire`, and joining two components at the same node id
 * is how they connect. This is what makes the model exactly as expressive as a real breadboard —
 * nothing about it assumes a particular topology (series, parallel, bridge, whatever a student
 * draws) is special-cased.
 */

export type NodeId = string

interface Terminals {
  readonly a: NodeId
  readonly b: NodeId
}

export interface Resistor extends Terminals {
  readonly kind: 'resistor'
  readonly id: string
  readonly ohms: number
}

/** Zero resistance. Modelled by merging `a` and `b` into one electrical node before solving. */
export interface Wire extends Terminals {
  readonly kind: 'wire'
  readonly id: string
}

/** A wire when closed; a break in the circuit when open. */
export interface Switch extends Terminals {
  readonly kind: 'switch'
  readonly id: string
  readonly closed: boolean
}

/**
 * A real cell: an ideal EMF in series with its own internal resistance, in one component so the
 * canvas never has to insert a hidden node for it. `a` is the positive terminal — current the
 * solver reports flowing `a` to `b` *inside* the battery is what drives the external circuit.
 */
export interface Battery extends Terminals {
  readonly kind: 'battery'
  readonly id: string
  readonly volts: number
  readonly internalOhms?: number
}

/** Ideal: zero resistance, and its whole reason to exist is reporting the current through it. */
export interface Ammeter extends Terminals {
  readonly kind: 'ammeter'
  readonly id: string
}

/** Ideal: infinite resistance (draws no current), reports the voltage across it. */
export interface Voltmeter extends Terminals {
  readonly kind: 'voltmeter'
  readonly id: string
}

export type Component = Resistor | Wire | Switch | Battery | Ammeter | Voltmeter

export interface Circuit {
  readonly components: readonly Component[]
  /** The node whose voltage is reported as exactly 0. Any node works; this just fixes the frame. */
  readonly ground: NodeId
}

export interface SolvedCircuit {
  readonly ok: true
  /**
   * Node voltage relative to `ground` — except for a node in an island the ground node cannot
   * reach (an open switch stranded it), which is relative to an arbitrary reference *within its
   * own island* instead. `islandOf` says which island each node landed in, so a caller can tell
   * the two cases apart rather than silently comparing incomparable numbers.
   */
  readonly nodeVoltage: ReadonlyMap<NodeId, number>
  readonly islandOf: ReadonlyMap<NodeId, number>
  /** By component id. Positive means the current flows from `a` to `b`. */
  readonly current: ReadonlyMap<string, number>
  /** By component id: V(a) - V(b). Defined even for a voltmeter, which carries none. */
  readonly voltage: ReadonlyMap<string, number>
}

export interface UnsolvableCircuit {
  readonly ok: false
  readonly error: string
}

export type SolveResult = SolvedCircuit | UnsolvableCircuit
