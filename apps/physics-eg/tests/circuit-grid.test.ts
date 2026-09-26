import { describe, expect, it } from 'vitest'

import { solveCircuit } from '@physics/circuit-sim'
import {
  computeLanes,
  defaultComponent,
  keyOf,
  pointsInUse,
  toCircuit,
  type PlacedComponent,
} from '@/components/circuit/grid'

/**
 * The grid layer is a thin translation from "two dots on a breadboard" to a solver `Circuit`.
 * Thin is not the same as untested: a wrong `keyOf` collision or a dropped internal resistance
 * would silently mis-wire every circuit a student builds on the canvas.
 */

describe('grid → circuit translation', () => {
  it('two components sharing a grid point are the same electrical node', () => {
    const components: PlacedComponent[] = [
      defaultComponent('battery', 'b1', { col: 0, row: 0 }, { col: 0, row: 3 }),
      defaultComponent('resistor', 'r1', { col: 0, row: 0 }, { col: 3, row: 0 }),
    ]
    const circuit = toCircuit(components, { col: 0, row: 3 })
    const battery = circuit.components.find((c) => c.id === 'b1')!
    const resistor = circuit.components.find((c) => c.id === 'r1')!
    // Both touch (0,0) — the translation must give them the identical node id there.
    expect(battery.a).toBe(keyOf({ col: 0, row: 0 }))
    expect(resistor.a).toBe(keyOf({ col: 0, row: 0 }))
    expect(battery.a).toBe(resistor.a)
  })

  it('reproduces the book series example end to end from grid points', () => {
    // The exact same 25/70/85 Ω, 45 V circuit as packages/circuit-sim's own test, this time built
    // the way a student would: four dots in a line, three resistors and a battery closing the loop.
    const p = (col: number) => ({ col, row: 0 })
    const components: PlacedComponent[] = [
      { id: 'r1', kind: 'resistor', a: p(0), b: p(1), ohms: 25 },
      { id: 'r2', kind: 'resistor', a: p(1), b: p(2), ohms: 70 },
      { id: 'r3', kind: 'resistor', a: p(2), b: p(3), ohms: 85 },
      { id: 'batt', kind: 'battery', a: p(3), b: p(0), volts: 45, internalOhms: 0 },
    ]
    const circuit = toCircuit(components, p(0))
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Math.abs(result.current.get('r1')!)).toBeCloseTo(0.25, 3)
    expect(Math.abs(result.voltage.get('r2')!)).toBeCloseTo(17.5, 3)
  })

  it('omitting internalOhms entirely for an ideal battery, rather than sending 0', () => {
    const c = defaultComponent('battery', 'b', { col: 0, row: 0 }, { col: 1, row: 0 })
    const circuit = toCircuit([c], { col: 0, row: 0 })
    const battery = circuit.components.find((x) => x.kind === 'battery')
    expect(battery && 'internalOhms' in battery ? battery.internalOhms : undefined).toBeUndefined()
  })

  it('defaults ground to the first point in use when none is set', () => {
    const components: PlacedComponent[] = [
      defaultComponent('wire', 'w', { col: 2, row: 2 }, { col: 4, row: 2 }),
    ]
    const circuit = toCircuit(components, null)
    expect(circuit.ground).toBe(keyOf({ col: 2, row: 2 }))
  })

  it('pointsInUse deduplicates shared endpoints', () => {
    const components: PlacedComponent[] = [
      defaultComponent('wire', 'w1', { col: 0, row: 0 }, { col: 1, row: 0 }),
      defaultComponent('wire', 'w2', { col: 1, row: 0 }, { col: 2, row: 0 }),
    ]
    expect(pointsInUse(components)).toHaveLength(3)
  })
})

describe('computeLanes', () => {
  // Regression test: a voltmeter drawn across a resistor rendered directly on top of it — same
  // line, same badge position, same value-label position — until every component on a shared
  // edge got fanned out to its own lane. Found by actually looking at the rendered lesson page.
  it('gives an unshared edge lane 0', () => {
    const components: PlacedComponent[] = [
      defaultComponent('resistor', 'r1', { col: 0, row: 0 }, { col: 1, row: 0 }),
      defaultComponent('wire', 'w1', { col: 1, row: 0 }, { col: 2, row: 0 }),
    ]
    const lanes = computeLanes(components)
    expect(lanes.get('r1')).toBe(0)
    expect(lanes.get('w1')).toBe(0)
  })

  it('gives two components on the same two points opposite, evenly spaced lanes', () => {
    const components: PlacedComponent[] = [
      defaultComponent('resistor', 'r1', { col: 0, row: 0 }, { col: 3, row: 0 }),
      defaultComponent('voltmeter', 'v1', { col: 0, row: 0 }, { col: 3, row: 0 }),
    ]
    const lanes = computeLanes(components)
    expect(lanes.get('r1')).toBe(-0.5)
    expect(lanes.get('v1')).toBe(0.5)
  })

  it('treats a-b and b-a as the same shared edge', () => {
    const components: PlacedComponent[] = [
      defaultComponent('resistor', 'r1', { col: 0, row: 0 }, { col: 3, row: 0 }),
      // Same two points, endpoints reversed — still the same electrical edge.
      defaultComponent('voltmeter', 'v1', { col: 3, row: 0 }, { col: 0, row: 0 }),
    ]
    const lanes = computeLanes(components)
    expect(lanes.get('r1')).not.toBe(lanes.get('v1'))
  })

  it('spaces three components on one edge symmetrically about zero', () => {
    const a = { col: 0, row: 0 }
    const b = { col: 1, row: 0 }
    const components: PlacedComponent[] = [
      defaultComponent('resistor', 'r1', a, b),
      defaultComponent('voltmeter', 'v1', a, b),
      defaultComponent('ammeter', 'a1', a, b),
    ]
    const lanes = computeLanes(components)
    const values = [lanes.get('r1')!, lanes.get('v1')!, lanes.get('a1')!].sort((x, y) => x - y)
    expect(values).toEqual([-1, 0, 1])
  })
})
