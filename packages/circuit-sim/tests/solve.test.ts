import { describe, expect, it } from 'vitest'

import { solveCircuit } from '../src'
import type { Circuit } from '../src'

/**
 * The series and parallel cases here are not invented: they are the worked examples from the
 * Egyptian 3rd-secondary electricity chapter (R = 25, 70, 85 Ω, V = 45 V), the same three numbers
 * used for both the series and parallel worked examples in the book. A solver that only agrees
 * with itself proves nothing; one that reproduces a textbook's own published answer is a solver
 * worth trusting for every problem this app will ever generate from that book.
 */

describe('solveCircuit — series resistors', () => {
  it('matches the book: R = 25, 70, 85 Ω, V = 45 V gives I = 0.25 A', () => {
    const circuit: Circuit = {
      ground: 'n0',
      components: [
        { kind: 'battery', id: 'batt', a: 'n0', b: 'n3', volts: 45 },
        { kind: 'resistor', id: 'r1', a: 'n0', b: 'n1', ohms: 25 },
        { kind: 'resistor', id: 'r2', a: 'n1', b: 'n2', ohms: 70 },
        { kind: 'resistor', id: 'r3', a: 'n2', b: 'n3', ohms: 85 },
      ],
    }
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(Math.abs(result.current.get('r1')!)).toBeCloseTo(0.25, 3)
    expect(Math.abs(result.current.get('r2')!)).toBeCloseTo(0.25, 3)
    expect(Math.abs(result.current.get('r3')!)).toBeCloseTo(0.25, 3)

    expect(Math.abs(result.voltage.get('r1')!)).toBeCloseTo(6.25, 3)
    expect(Math.abs(result.voltage.get('r2')!)).toBeCloseTo(17.5, 3)
    expect(Math.abs(result.voltage.get('r3')!)).toBeCloseTo(21.25, 3)

    // Series voltages sum to the source.
    const total =
      Math.abs(result.voltage.get('r1')!) +
      Math.abs(result.voltage.get('r2')!) +
      Math.abs(result.voltage.get('r3')!)
    expect(total).toBeCloseTo(45, 3)
  })
})

describe('solveCircuit — parallel resistors', () => {
  it('matches the book: R = 25, 70, 85 Ω, V = 45 V gives branch currents 1.8, 0.64, 0.53 A', () => {
    const circuit: Circuit = {
      ground: 'gnd',
      components: [
        { kind: 'battery', id: 'batt', a: 'pos', b: 'gnd', volts: 45 },
        { kind: 'resistor', id: 'r1', a: 'pos', b: 'gnd', ohms: 25 },
        { kind: 'resistor', id: 'r2', a: 'pos', b: 'gnd', ohms: 70 },
        { kind: 'resistor', id: 'r3', a: 'pos', b: 'gnd', ohms: 85 },
      ],
    }
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(Math.abs(result.current.get('r1')!)).toBeCloseTo(1.8, 2)
    expect(Math.abs(result.current.get('r2')!)).toBeCloseTo(0.642857, 2)
    expect(Math.abs(result.current.get('r3')!)).toBeCloseTo(0.529412, 2)

    // All three see the full 45 V — that is what "parallel" means.
    expect(result.voltage.get('r1')).toBeCloseTo(45, 3)
    expect(result.voltage.get('r2')).toBeCloseTo(45, 3)
    expect(result.voltage.get('r3')).toBeCloseTo(45, 3)

    // Total current out of the battery is the sum of the branches (book: ≈ 2.97 A).
    const total =
      Math.abs(result.current.get('r1')!) +
      Math.abs(result.current.get('r2')!) +
      Math.abs(result.current.get('r3')!)
    expect(total).toBeCloseTo(2.97, 2)
    expect(Math.abs(result.current.get('batt')!)).toBeCloseTo(total, 3)
  })
})

describe('solveCircuit — EMF and internal resistance', () => {
  it('matches the book: EMF = 2 V, r = 0.1 Ω, R = 3.9 Ω gives I = 0.5 A', () => {
    const circuit: Circuit = {
      ground: 'neg',
      components: [
        { kind: 'battery', id: 'cell', a: 'pos', b: 'neg', volts: 2, internalOhms: 0.1 },
        { kind: 'resistor', id: 'rext', a: 'pos', b: 'neg', ohms: 3.9 },
      ],
    }
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(Math.abs(result.current.get('cell')!)).toBeCloseTo(0.5, 4)
    expect(Math.abs(result.current.get('rext')!)).toBeCloseTo(0.5, 4)
    // Terminal voltage = EMF - I*r = 2 - 0.5*0.1 = 1.95 V, and that is exactly what the external
    // resistor sees: 0.5 A * 3.9 Ω = 1.95 V too.
    expect(Math.abs(result.voltage.get('rext')!)).toBeCloseTo(1.95, 4)
  })

  it('an open switch strands the current at zero without crashing the solver', () => {
    const circuit: Circuit = {
      ground: 'neg',
      components: [
        { kind: 'battery', id: 'cell', a: 'pos', b: 'neg', volts: 2, internalOhms: 0.1 },
        { kind: 'switch', id: 'k', a: 'pos', b: 'mid', closed: false },
        { kind: 'resistor', id: 'rext', a: 'mid', b: 'neg', ohms: 3.9 },
      ],
    }
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // No closed loop: no current anywhere, and nothing throws despite the resistor being
    // stranded in its own island with no source.
    expect(result.current.get('rext')).toBe(0)
  })
})

describe('solveCircuit — ideal meters', () => {
  it('an ammeter in series reads the loop current and perturbs nothing', () => {
    const circuit: Circuit = {
      ground: 'neg',
      components: [
        { kind: 'battery', id: 'cell', a: 'pos', b: 'neg', volts: 10 },
        { kind: 'ammeter', id: 'A', a: 'pos', b: 'mid' },
        { kind: 'resistor', id: 'r', a: 'mid', b: 'neg', ohms: 5 },
      ],
    }
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(Math.abs(result.current.get('A')!)).toBeCloseTo(2, 4)
    expect(Math.abs(result.current.get('r')!)).toBeCloseTo(2, 4)
  })

  it('a voltmeter across a resistor reads IR and draws no current of its own', () => {
    const circuit: Circuit = {
      ground: 'neg',
      components: [
        { kind: 'battery', id: 'cell', a: 'pos', b: 'neg', volts: 10 },
        { kind: 'resistor', id: 'r1', a: 'pos', b: 'mid', ohms: 5 },
        { kind: 'resistor', id: 'r2', a: 'mid', b: 'neg', ohms: 5 },
        { kind: 'voltmeter', id: 'V', a: 'mid', b: 'neg' },
      ],
    }
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Equal resistors split the 10 V evenly; the voltmeter must read exactly r2's voltage.
    expect(result.voltage.get('V')).toBeCloseTo(5, 4)
    expect(result.voltage.get('V')).toBeCloseTo(result.voltage.get('r2')!, 6)
  })

  it('reports NaN for a voltmeter bridging two unconnected islands', () => {
    const circuit: Circuit = {
      ground: 'neg',
      components: [
        { kind: 'battery', id: 'cell', a: 'pos', b: 'neg', volts: 10 },
        { kind: 'resistor', id: 'r', a: 'pos', b: 'neg', ohms: 5 },
        // 'stray' is not connected to anything else at all.
        { kind: 'voltmeter', id: 'V', a: 'pos', b: 'stray' },
      ],
    }
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Number.isNaN(result.voltage.get('V'))).toBe(true)
  })
})

describe('solveCircuit — a wire is not a resistor', () => {
  it('a resistor bridged by a wire is short-circuited: all current takes the wire', () => {
    const circuit: Circuit = {
      ground: 'neg',
      components: [
        { kind: 'battery', id: 'cell', a: 'pos', b: 'neg', volts: 10 },
        { kind: 'resistor', id: 'r1', a: 'pos', b: 'mid', ohms: 5 },
        { kind: 'resistor', id: 'r2', a: 'mid', b: 'neg', ohms: 5 },
        // Shorts out r2.
        { kind: 'wire', id: 'w', a: 'mid', b: 'neg' },
      ],
    }
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.voltage.get('r2')).toBeCloseTo(0, 6)
    expect(Math.abs(result.current.get('r1')!)).toBeCloseTo(2, 4) // 10V / 5Ω only
  })
})

describe('solveCircuit — an unbalanced Wheatstone bridge', () => {
  it('matches an independently solved reference (sympy nodal analysis)', () => {
    // A–B–D and A–C–D are the two arms (10+20 Ω and 20+10 Ω), bridged B–C by a 5 Ω galvanometer
    // resistor. Unbalanced (10/20 != 20/10... wait: 10*10 != 20*20), so current crosses the
    // bridge — this is exactly the shape of the diamond circuits the book's lesson 2 reduces by
    // hand. Reference values computed independently via sympy nodal analysis, not from memory of
    // any specific textbook figure, so this checks the solver against arbitrary mesh topology
    // rather than against a case it might have been tuned to.
    const circuit: Circuit = {
      ground: 'D',
      components: [
        { kind: 'battery', id: 'batt', a: 'A', b: 'D', volts: 10 },
        { kind: 'resistor', id: 'r1', a: 'A', b: 'B', ohms: 10 },
        { kind: 'resistor', id: 'r2', a: 'A', b: 'C', ohms: 20 },
        { kind: 'resistor', id: 'r3', a: 'B', b: 'D', ohms: 20 },
        { kind: 'resistor', id: 'r4', a: 'C', b: 'D', ohms: 10 },
        { kind: 'resistor', id: 'r5', a: 'B', b: 'C', ohms: 5 },
      ],
    }
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.nodeVoltage.get('B')).toBeCloseTo(60 / 11, 6)
    expect(result.nodeVoltage.get('C')).toBeCloseTo(50 / 11, 6)
    expect(Math.abs(result.current.get('r1')!)).toBeCloseTo(0.454545, 5)
    expect(Math.abs(result.current.get('r2')!)).toBeCloseTo(0.272727, 5)
    expect(Math.abs(result.current.get('r3')!)).toBeCloseTo(0.272727, 5)
    expect(Math.abs(result.current.get('r4')!)).toBeCloseTo(0.454545, 5)
    expect(Math.abs(result.current.get('r5')!)).toBeCloseTo(0.181818, 5)
    expect(Math.abs(result.current.get('batt')!)).toBeCloseTo(0.727273, 5)
  })
})

describe('solveCircuit — unsolvable circuits', () => {
  it('reports an error rather than throwing when two sources conflict', () => {
    const circuit: Circuit = {
      ground: 'neg',
      components: [
        { kind: 'battery', id: 'a', a: 'pos', b: 'neg', volts: 10 },
        { kind: 'battery', id: 'b', a: 'pos', b: 'neg', volts: 5 },
      ],
    }
    const result = solveCircuit(circuit)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('no unique solution')
  })
})
