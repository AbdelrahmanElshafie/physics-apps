import fs from 'node:fs'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { describe, expect, it } from 'vitest'

import {
  conductivity,
  currentFromCharge,
  currentWithInternalResistance,
  electronCount,
  lineFromTwoPoints,
  parallelResistance,
  potentialDifference,
  potentialDifferenceBetweenPoints,
  powerFromIR,
  powerFromVI,
  powerFromVR,
  resistanceFromGeometry,
  resistanceFromOhmsLaw,
  seriesEmf,
  seriesResistance,
  terminalVoltage,
  workFromChargeAndVoltage,
} from '@core/domain'

/**
 * A number the lesson prints is a number a test checks — same discipline as physics-instructor's
 * relativistic.test.ts. The book's own worked example (I = 20 A, t = 2 s, N = 2.5e20 electrons)
 * is reproduced exactly here, so if the formula or the lesson's own arithmetic ever drift apart,
 * this fails instead of a student finding the mismatch first.
 */

const CONTENT = path.join(process.cwd(), 'content', 'syllabi', 'electricity')
const TOPIC = 'current-and-charge'
const TOPIC2 = 'potential-difference'
const TOPIC3 = 'ohms-law'
const TOPIC4 = 'resistivity'
const TOPIC5 = 'series-resistors'
const TOPIC6 = 'parallel-resistors'
const TOPIC7 = 'series-vs-parallel'
const TOPIC8 = 'mixed-circuits'
const TOPIC9 = 'bridge-circuits'
const TOPIC10 = 'switches-in-circuits'
const TOPIC11 = 'lamps-brightness'
const TOPIC12 = 'emf-and-internal-resistance'
const TOPIC13 = 'terminal-voltage-graphs'
const TOPIC14 = 'cells-aiding-opposing'
const TOPIC15 = 'kirchhoff-current-law'
const TOPIC16 = 'kirchhoff-voltage-law'

/** Reads one topic's exercise file, keyed by exercise id. */
function readExercises(topic: string) {
  const raw = fs.readFileSync(path.join(CONTENT, 'exercises', `${topic}.yaml`), 'utf8')
  const parsed = parseYaml(raw) as {
    exercises: { id: string; check: { type: string; value?: unknown; tolerance?: number } }[]
  }
  return new Map(parsed.exercises.map((e) => [e.id, e.check]))
}

describe('electricity formulas', () => {
  it('reproduces the textbook worked example: I = 20 A, t = 2 s gives N = 2.5e20', () => {
    const charge = currentFromCharge(40, 1) // Q = I t is the inverse; charge is just I*t here.
    expect(charge).toBe(40)
    expect(electronCount(20 * 2)).toBeCloseTo(2.5e20, -18)
  })

  it('current from charge over time', () => {
    expect(currentFromCharge(6, 3)).toBeCloseTo(2, 6)
    expect(currentFromCharge(15, 5)).toBeCloseTo(3, 6)
  })
})

describe('the lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC}.mdx`), 'utf8')

  it('states the worked example result', () => {
    expect(mdx).toContain('2.5 \\times 10^{20}')
  })

  it('states the simple slope example (12 C / 4 s = 3 A)', () => {
    const slopeCurrent = 12 / 4
    expect(slopeCurrent).toBe(3)
    expect(mdx).toContain('12/4 = 3')
  })
})

describe('the exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC)

  const expected: Record<string, number> = {
    cc1: currentFromCharge(6, 3),
    cc2: 5 * 4, // Q = I t
    cc3: 15 / 5,
    cc4: electronCount(20 * 2),
    cc5: electronCount(3.2),
    cc6: currentFromCharge(1.25e19 * 1.6e-19, 2),
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('ohms-law formulas', () => {
  it('R = V/I and its inverses V = IR, I = V/R are mutually consistent', () => {
    const R = resistanceFromOhmsLaw(12, 3)
    expect(R).toBe(4)
    const V = 4 * R // V = IR at I = 4 A
    const I = 20 / R // I = V/R at V = 20 V
    expect(V).toBe(16)
    expect(I).toBe(5)
  })

  it('constant resistance: current scales with voltage', () => {
    const R = resistanceFromOhmsLaw(6, 2)
    expect(R).toBe(3)
    expect(18 / R).toBe(6) // tripling V triples I when R is held fixed
  })
})

describe('the third lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC3}.mdx`), 'utf8')

  it('states the R = V/I worked example (12 V / 3 A = 4 ohm)', () => {
    expect(resistanceFromOhmsLaw(12, 3)).toBe(4)
    expect(mdx).toContain('frac{12\\ \\text{V}}{3\\ \\text{A}}')
    expect(mdx).toContain('R = 4\\ \\Omega')
  })

  it('states the slope-reading example (8 V / 2 A = 4 ohm)', () => {
    expect(resistanceFromOhmsLaw(8, 2)).toBe(4)
    expect(mdx).toContain('frac{8\\ \\text{V}}{2\\ \\text{A}}')
  })

  it('states the Predict answer (tripling V triples I: 2 A -> 6 A)', () => {
    const R = resistanceFromOhmsLaw(6, 2)
    expect(18 / R).toBe(6)
    expect(mdx).toContain('2 \\times 3 = 6')
  })
})

describe('the third lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC3)

  const expected: Record<string, number> = {
    ol1: resistanceFromOhmsLaw(12, 3),
    ol2: 20 / 5, // I = V/R
    ol3: 1.5 * 8, // V = IR
    ol4: resistanceFromOhmsLaw(8, 2),
    ol5: 18 / resistanceFromOhmsLaw(6, 2),
    ol6: 0.5 * resistanceFromOhmsLaw(6, 2),
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('potential-difference formulas', () => {
  it('V = W/Q and its inverse W = QV round-trip', () => {
    expect(potentialDifference(100, 20)).toBeCloseTo(5, 6)
    expect(workFromChargeAndVoltage(4, 12)).toBe(48)
    // Round-trip: the work implied by a voltage must give the same voltage back.
    expect(potentialDifference(workFromChargeAndVoltage(4, 12), 4)).toBeCloseTo(12, 6)
  })

  it('V_AB = V_A - V_B, including the sign flip for a negative V_B', () => {
    expect(potentialDifferenceBetweenPoints(20, -30)).toBe(50)
    expect(potentialDifferenceBetweenPoints(5, -15)).toBe(20)
  })

  it('is invariant under shifting the reference point (adding the same constant to both)', () => {
    const shift = 1000
    const original = potentialDifferenceBetweenPoints(20, -30)
    const shifted = potentialDifferenceBetweenPoints(20 + shift, -30 + shift)
    expect(shifted).toBe(original)
  })
})

describe('the second lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC2}.mdx`), 'utf8')

  it('states the V = W/Q worked example (100 J / 20 C = 5 V)', () => {
    expect(potentialDifference(100, 20)).toBe(5)
    expect(mdx).toContain('frac{100\\ \\text{J}}{20\\ \\text{C}}')
    expect(mdx).toContain('V = 5\\ \\text{V}')
  })

  it('states the V_AB worked example (20 - (-30) = 50 V)', () => {
    expect(potentialDifferenceBetweenPoints(20, -30)).toBe(50)
    expect(mdx).toContain('V_{AB} = 50\\ \\text{V}')
  })

  it('states the W = QV worked example (4 x 12 = 48 J)', () => {
    expect(workFromChargeAndVoltage(4, 12)).toBe(48)
    expect(mdx).toContain('W = 48\\ \\text{J}')
  })
})

describe('the second lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC2)

  const expected: Record<string, number> = {
    pd1: potentialDifference(100, 20),
    pd2: workFromChargeAndVoltage(4, 12),
    pd3: workFromChargeAndVoltage(0.5, 220),
    pd4: potentialDifferenceBetweenPoints(20, -30),
    pd5: potentialDifferenceBetweenPoints(5, -15),
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('resistivity formulas', () => {
  it('R = rho L / A, and inverting for L is consistent', () => {
    const R = resistanceFromGeometry(2e-8, 10, 2e-6)
    expect(R).toBeCloseTo(0.1, 10)
    const L = (6 * 1e-6) / 3e-8
    expect(L).toBeCloseTo(200, 6)
  })

  it('conductivity is the exact reciprocal of resistivity', () => {
    expect(conductivity(1e-7)).toBeCloseTo(1e7, 0)
    expect(conductivity(resistanceFromGeometry(1, 1, 1))).toBeCloseTo(1, 10) // rho=1 round trip
  })

  it('doubling length and area together leaves resistance unchanged', () => {
    const R1 = resistanceFromGeometry(5e-8, 10, 3e-6)
    const R2 = resistanceFromGeometry(5e-8, 20, 6e-6)
    expect(R2).toBeCloseTo(R1, 10)
  })

  it('the two-wire ratio problems reduce correctly (resistivity cancels)', () => {
    // Wire X: 2L, A/2. Wire Y: L, A. Same material.
    const rho = 4e-8
    const L = 3
    const A = 1e-6
    const Rx = resistanceFromGeometry(rho, 2 * L, A / 2)
    const Ry = resistanceFromGeometry(rho, L, A)
    expect(Rx / Ry).toBeCloseTo(4, 6)
  })
})

describe('the fourth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC4}.mdx`), 'utf8')

  it('states the R = rho L / A worked example (0.1 ohm)', () => {
    expect(resistanceFromGeometry(2e-8, 10, 2e-6)).toBeCloseTo(0.1, 10)
    expect(mdx).toContain('R = 0.1\\ \\Omega')
  })

  it('the nichrome exercise value matches the formula (rs2 is checked separately below)', () => {
    // This exact example (rho=1e-6, L=2, A=0.5e-6 -> 4 ohm) appears only as exercise rs2, not
    // as lesson prose — nothing to assert against the mdx here beyond the formula itself.
    expect(resistanceFromGeometry(1e-6, 2, 0.5e-6)).toBeCloseTo(4, 10)
  })

  it('states the slope-to-resistivity worked example (2e-8 ohm.m)', () => {
    const slope = 0.5 / 50
    const rho = slope * 2e-6
    expect(rho).toBeCloseTo(2e-8, 12)
    expect(mdx).toContain('times10^{-8}\\ \\Omega\\cdot\\text{m}')
  })

  it('states the two-wire ratio worked example (R_A/R_B = 4)', () => {
    const ratio = (2 / 1) / (1 / 2)
    expect(ratio).toBe(4)
    expect(mdx).toContain('R_A}{R_B} = 4')
  })
})

describe('the fourth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC4)

  const expected: Record<string, number> = {
    rs1: resistanceFromGeometry(2e-8, 10, 2e-6),
    rs2: resistanceFromGeometry(1e-6, 2, 0.5e-6),
    rs3: (6 * 1e-6) / 3e-8,
    rs4: (0.5 / 50) * 2e-6,
    rs5: conductivity(1e-7),
    rs7: resistanceFromGeometry(1, 2, 0.5) / resistanceFromGeometry(1, 1, 1),
    rs8: 3,
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('series-resistors formulas', () => {
  it('reproduces the textbook worked example: 25+70+85 ohm at 45 V gives I = 0.25 A', () => {
    const req = seriesResistance([25, 70, 85])
    expect(req).toBe(180)
    const I = 45 / req
    expect(I).toBeCloseTo(0.25, 10)
  })

  it('the per-resistor voltage drops sum back to the total', () => {
    const I = 0.25
    const v1 = I * 25
    const v2 = I * 70
    const v3 = I * 85
    expect(v1 + v2 + v3).toBeCloseTo(45, 10)
  })

  it('equivalent resistance is always at least the largest individual resistor', () => {
    expect(seriesResistance([4, 6, 10])).toBeGreaterThan(10)
  })
})

describe('the fifth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC5}.mdx`), 'utf8')

  it('states the worked example’s equivalent resistance (180 ohm)', () => {
    expect(seriesResistance([25, 70, 85])).toBe(180)
    expect(mdx).toContain('R_{eq} = 25 + 70 + 85 = 180\\ \\Omega')
  })

  it('states the worked example’s current (0.25 A)', () => {
    expect(45 / seriesResistance([25, 70, 85])).toBeCloseTo(0.25, 10)
    expect(mdx).toContain('I = \\frac{V}{R_{eq}} = \\frac{45\\ \\text{V}}{180\\ \\Omega} = 0.25\\ \\text{A}')
  })

  it('states the worked example’s per-resistor voltage drops, summing to 45 V', () => {
    const I = 0.25
    expect(I * 25).toBeCloseTo(6.25, 10)
    expect(I * 70).toBeCloseTo(17.5, 10)
    expect(I * 85).toBeCloseTo(21.25, 10)
    expect(mdx).toContain('V_1 + V_2 + V_3 = 6.25 + 17.5 + 21.25 = 45\\ \\text{V}')
  })
})

describe('the fifth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC5)

  const expected: Record<string, number> = {
    sr1: seriesResistance([4, 6, 10]),
    sr2: 40 / seriesResistance([4, 6, 10]),
    sr3: 2 * 6,
    sr4: 20 - 6 - 9,
    sr5: 45 / seriesResistance([25, 70, 85]),
    sr6: (45 / seriesResistance([25, 70, 85])) * 70,
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('parallel-resistors formulas', () => {
  it('reproduces the same 25/70/85 ohm trio as the series lesson, now in parallel', () => {
    const req = parallelResistance([25, 70, 85])
    expect(req).toBeCloseTo(15.1398, 3)
    const I = 1.8 + 45 / 70 + 45 / 85
    expect(I).toBeCloseTo(2.9723, 3)
    expect(45 / req).toBeCloseTo(I, 6) // total current two ways must agree
  })

  it('equivalent resistance is always at most the smallest individual resistor', () => {
    expect(parallelResistance([4, 4])).toBeLessThan(4)
  })
})

describe('the sixth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC6}.mdx`), 'utf8')

  it('states the worked example’s equivalent resistance (approx 15.14 ohm)', () => {
    expect(parallelResistance([25, 70, 85])).toBeCloseTo(15.1398, 3)
    expect(mdx).toContain('R_{eq} \\approx 15.14\\ \\Omega')
  })

  it('states the worked example’s branch currents (1.8, 0.643, 0.529 A)', () => {
    expect(45 / 25).toBe(1.8)
    expect(45 / 70).toBeCloseTo(0.643, 3)
    expect(45 / 85).toBeCloseTo(0.529, 3)
    expect(mdx).toContain(
      'I_1 = \\frac{45}{25} = 1.8\\ \\text{A}, \\quad I_2 = \\frac{45}{70} \\approx 0.643\\ \\text{A}, \\quad I_3 = \\frac{45}{85} \\approx 0.529\\ \\text{A}',
    )
  })

  it('states the worked example’s total current (approx 2.97 A)', () => {
    expect(1.8 + 45 / 70 + 45 / 85).toBeCloseTo(2.97, 2)
    expect(mdx).toContain('I = 1.8 + 0.643 + 0.529 \\approx 2.97\\ \\text{A}')
  })
})

describe('the sixth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC6)

  const expected: Record<string, number> = {
    pr1: parallelResistance([4, 4]),
    pr2: 8 / parallelResistance([4, 4]),
    pr3: 8 / 4,
    pr4: parallelResistance([25, 70, 85]),
    pr5: 45 / parallelResistance([25, 70, 85]),
    pr6: 45 / 70,
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('series-vs-parallel formulas', () => {
  it('the same two 6-ohm resistors give 12 ohm in series and 3 ohm in parallel', () => {
    expect(seriesResistance([6, 6])).toBe(12)
    expect(parallelResistance([6, 6])).toBe(3)
    expect(seriesResistance([6, 6]) / parallelResistance([6, 6])).toBe(4)
  })

  it('the same 25/70/85 ohm trio at 45 V draws far more total power in parallel than in series', () => {
    const pSeries = powerFromVI(45, 45 / seriesResistance([25, 70, 85]))
    const pParallel = powerFromVI(45, 45 / parallelResistance([25, 70, 85]))
    expect(pSeries).toBeCloseTo(11.25, 6)
    expect(pParallel).toBeCloseTo(133.75, 1)
    expect(pParallel).toBeGreaterThan(pSeries)
  })
})

describe('the seventh lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC7}.mdx`), 'utf8')

  it('states the 6-ohm-pair equivalent resistances (12 and 3 ohm) and their ratio', () => {
    expect(seriesResistance([6, 6])).toBe(12)
    expect(parallelResistance([6, 6])).toBe(3)
    expect(mdx).toContain('R_{series} = 6 + 6 = 12\\ \\Omega')
    expect(mdx).toContain('\\frac{1}{R_{parallel}} = \\frac{1}{6} + \\frac{1}{6} = \\frac{1}{3} \\Rightarrow R_{parallel} = 3\\ \\Omega')
    expect(mdx).toContain('\\frac{R_{series}}{R_{parallel}} = \\frac{12}{3} = 4')
  })

  it('states the worked power comparison (11.25 W vs approx 133.75 W)', () => {
    const pSeries = powerFromVI(45, 45 / seriesResistance([25, 70, 85]))
    expect(pSeries).toBeCloseTo(11.25, 6)
    expect(mdx).toContain('P_{series} = V I = 45 \\times 0.25 = 11.25\\ \\text{W}')
    expect(mdx).toContain('P_{parallel} = V I \\approx 45 \\times 2.97 \\approx 133.75\\ \\text{W}')
  })
})

describe('the seventh lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC7)

  const expected: Record<string, number> = {
    sp1: seriesResistance([6, 6]),
    sp2: parallelResistance([6, 6]),
    sp3: seriesResistance([6, 6]) / parallelResistance([6, 6]),
    sp4: 12 / seriesResistance([6, 6]),
    sp5: 12 / parallelResistance([6, 6]),
    sp6: (12 / parallelResistance([6, 6])) / (12 / seriesResistance([6, 6])),
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('mixed-circuits formulas', () => {
  it('worked example 1: R1 series with (R2 parallel R3), 5/10/10 ohm at 20 V', () => {
    const r23 = parallelResistance([10, 10])
    expect(r23).toBe(5)
    const rTotal = seriesResistance([5, r23])
    expect(rTotal).toBe(10)
    const I = 20 / rTotal
    expect(I).toBe(2)
    const v23 = I * r23
    expect(v23).toBe(10)
    const i2 = v23 / 10
    const i3 = v23 / 10
    expect(i2 + i3).toBe(I)
  })

  it('worked example 2: (R1 series R2) parallel with R3, 2/4/6 ohm at 12 V', () => {
    const r12 = seriesResistance([2, 4])
    expect(r12).toBe(6)
    const rTotal = parallelResistance([r12, 6])
    expect(rTotal).toBe(3)
    const I = 12 / rTotal
    expect(I).toBe(4)
    const i12 = 12 / r12
    expect(i12).toBe(2)
    const v1 = i12 * 2
    const v2 = i12 * 4
    expect(v1 + v2).toBe(12)
  })
})

describe('the eighth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC8}.mdx`), 'utf8')

  it('states worked example 1’s reduction chain (5 -> 10 ohm, 2 A, 10 V, 1+1 A)', () => {
    expect(mdx).toContain('R_{23} = \\left(\\frac{1}{10} + \\frac{1}{10}\\right)^{-1} = 5\\ \\Omega')
    expect(mdx).toContain('R_{total} = R_1 + R_{23} = 5 + 5 = 10\\ \\Omega')
    expect(mdx).toContain('I = \\frac{V}{R_{total}} = \\frac{20}{10} = 2\\ \\text{A}')
    expect(mdx).toContain('V_{23} = I_{23} R_{23} = 2 \\times 5 = 10\\ \\text{V}')
    expect(mdx).toContain('I_2 + I_3 = 1 + 1 = 2\\ \\text{A} = I')
  })

  it('states worked example 2’s reduction chain (6 -> 3 ohm, 4 A, 4+8 V)', () => {
    expect(mdx).toContain('R_{12} = R_1 + R_2 = 2 + 4 = 6\\ \\Omega')
    expect(mdx).toContain('R_{total} = \\left(\\frac{1}{6} + \\frac{1}{6}\\right)^{-1} = 3\\ \\Omega')
    expect(mdx).toContain('I = \\frac{V}{R_{total}} = \\frac{12}{3} = 4\\ \\text{A}')
    expect(mdx).toContain('V_1 + V_2 = 4 + 8 = 12\\ \\text{V}')
  })
})

describe('the eighth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC8)

  const r23 = parallelResistance([10, 10])
  const r12 = seriesResistance([2, 4])

  const expected: Record<string, number> = {
    mc1: seriesResistance([5, r23]),
    mc2: 20 / seriesResistance([5, r23]),
    mc3: (20 / seriesResistance([5, r23])) * r23,
    mc4: parallelResistance([r12, 6]),
    mc5: 12 / parallelResistance([r12, 6]),
    mc6: (12 / r12) * 2,
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('bridge-circuits formulas', () => {
  it('the balance condition R1 R4 = R2 R3 holds for the lesson’s own bridge (10/20/5/10)', () => {
    expect(10 * 10).toBe(20 * 5)
  })

  it('a balanced bridge’s two arms behave as independent series dividers (10/20 and 5/10 at 12 V)', () => {
    const i1 = 12 / seriesResistance([10, 20])
    const i2 = 12 / seriesResistance([5, 10])
    expect(i1).toBeCloseTo(0.4, 6)
    expect(i2).toBeCloseTo(0.8, 6)
  })

  it('solves the unknown-resistance worked example: Rx = R2 R3 / R1', () => {
    const rx = (40 * 15) / 10
    expect(rx).toBe(60)
  })
})

describe('the ninth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC9}.mdx`), 'utf8')

  it('states the balance-condition derivation and the numeric confirmation', () => {
    expect(mdx).toContain('R_2(R_3 + R_4) = R_4(R_1 + R_2) \\;\\Rightarrow\\; R_2 R_3 = R_1 R_4')
    expect(mdx).toContain('R_1 R_4 = 10 \\times 10 = 100, \\qquad R_2 R_3 = 20 \\times 5 = 100')
  })

  it('states the unknown-resistance worked example (Rx = 60 ohm)', () => {
    expect((40 * 15) / 10).toBe(60)
    expect(mdx).toContain('R_x = \\frac{40 \\times 15}{10} = 60\\ \\Omega')
  })
})

describe('the ninth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC9)

  const expected: Record<string, number> = {
    bc1: (18 * 8) / 6,
    bc2: (15 * 12) / 5,
    bc3: (8 * 10) / 4,
    bc4: 12 / seriesResistance([10, 20]),
    bc5: 12 / seriesResistance([5, 10]),
    bc6: 0,
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('switches-in-circuits formulas', () => {
  it('a branch switch only affects its own branch: opening S2 leaves I1 on the 6-ohm branch unchanged', () => {
    const i1Closed = 12 / 6
    const i1Open = 12 / 6 // voltage across the branch is unaffected by the other branch's switch
    expect(i1Closed).toBe(i1Open)
    expect(i1Closed).toBe(2)
  })

  it('a bypass switch across R2 (8 ohm) triples the total current: 2 A open, 6 A closed', () => {
    const iOpen = 24 / seriesResistance([4, 8])
    const iClosed = 24 / 4 // R2 shorted out, only R1 remains
    expect(iOpen).toBe(2)
    expect(iClosed).toBe(6)
    expect(iClosed / iOpen).toBe(3)
  })
})

describe('the tenth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC10}.mdx`), 'utf8')

  it('states the branch-switch worked example (2 A unaffected, 1 A, then 0 A)', () => {
    expect(mdx).toContain('I_1 = \\frac{12}{6} = 2\\ \\text{A}, \\quad I_2 = \\frac{12}{12} = 1\\ \\text{A}')
    expect(mdx).toContain('I_2 = 0\\ \\text{A}')
    expect(mdx).toContain('لكن فرق الجهد على الفرع الأول (اللي فيه R₁ وS₁) لسه نفسه')
  })

  it('states the bypass-switch worked example (2 A open, 6 A closed)', () => {
    expect(mdx).toContain('I = \\frac{V}{R_1 + R_2} = \\frac{24}{4 + 8} = 2\\ \\text{A}')
    expect(mdx).toContain('I = \\frac{24}{4} = 6\\ \\text{A}')
    expect(mdx).toContain('I_{R_2} = 0\\ \\text{A}')
  })
})

describe('the tenth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC10)

  const expected: Record<string, number> = {
    sw1: 12 / 6,
    sw2: 12 / 6,
    sw3: 0,
    sw4: 24 / seriesResistance([4, 8]),
    sw5: 24 / 4,
    sw6: 0,
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('lamps-brightness formulas', () => {
  it('identical 4-ohm lamps at 12 V: 36 W alone, 9 W in series, 36 W in parallel', () => {
    const pAlone = powerFromVR(12, 4)
    expect(pAlone).toBe(36)
    const iSeries = 12 / seriesResistance([4, 4])
    const pSeries = powerFromIR(iSeries, 4)
    expect(pSeries).toBe(9)
    const pParallel = powerFromVR(12, 4)
    expect(pParallel).toBe(pAlone)
  })

  it('different lamps (2/4 ohm) at 12 V: bigger R wins in series, smaller R wins in parallel', () => {
    const i = 12 / seriesResistance([2, 4])
    const p1Series = powerFromIR(i, 2)
    const p2Series = powerFromIR(i, 4)
    expect(p1Series).toBe(8)
    expect(p2Series).toBe(16)
    expect(p2Series).toBeGreaterThan(p1Series)

    const p1Parallel = powerFromVR(12, 2)
    const p2Parallel = powerFromVR(12, 4)
    expect(p1Parallel).toBe(72)
    expect(p2Parallel).toBe(36)
    expect(p1Parallel).toBeGreaterThan(p2Parallel)
  })
})

describe('the eleventh lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC11}.mdx`), 'utf8')

  it('states the identical-lamps worked example (36 W, 9 W, 36 W)', () => {
    expect(mdx).toContain('P_{alone} = \\frac{V^2}{R} = \\frac{12^2}{4} = 36\\ \\text{W}')
    expect(mdx).toContain('P_{series} = I^2 R = 1.5^2 \\times 4 = 9\\ \\text{W}')
    expect(mdx).toContain('P_{parallel} = \\frac{V^2}{R} = \\frac{12^2}{4} = 36\\ \\text{W}')
  })

  it('states the different-lamps series and parallel worked examples (8/16 W, then 72/36 W)', () => {
    expect(mdx).toContain('P_1 = I^2 R_1 = 2^2 \\times 2 = 8\\ \\text{W}, \\quad P_2 = I^2 R_2 = 2^2 \\times 4 = 16\\ \\text{W}')
    expect(mdx).toContain('P_1 = \\frac{V^2}{R_1} = \\frac{12^2}{2} = 72\\ \\text{W}, \\quad P_2 = \\frac{V^2}{R_2} = \\frac{12^2}{4} = 36\\ \\text{W}')
  })
})

describe('the eleventh lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC11)

  const expected: Record<string, number> = {
    lb1: powerFromVR(12, 4),
    lb2: powerFromIR(12 / seriesResistance([4, 4]), 4),
    lb3: powerFromVR(12, 4),
    lb4: powerFromIR(12 / seriesResistance([2, 4]), 2),
    lb5: powerFromIR(12 / seriesResistance([2, 4]), 4),
    lb6: powerFromVR(12, 2),
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('emf-and-internal-resistance formulas', () => {
  it('reproduces the worked example: emf=6V, r=0.5, R=2.5 gives I=2A, V=5V', () => {
    const I = currentWithInternalResistance(6, 2.5, 0.5)
    expect(I).toBe(2)
    const V = terminalVoltage(6, I, 0.5)
    expect(V).toBe(5)
    expect(I * 2.5).toBe(V)
  })

  it('short-circuit current is emf/r, far larger than the normal operating current', () => {
    const iShort = currentWithInternalResistance(6, 0, 0.5)
    expect(iShort).toBe(12)
    expect(iShort).toBeGreaterThan(currentWithInternalResistance(6, 2.5, 0.5))
  })

  it('terminal voltage approaches emf as external resistance grows', () => {
    const vSmallR = terminalVoltage(6, currentWithInternalResistance(6, 2.5, 0.5), 0.5)
    const vBigR = terminalVoltage(6, currentWithInternalResistance(6, 250, 0.5), 0.5)
    expect(vBigR).toBeGreaterThan(vSmallR)
    expect(vBigR).toBeCloseTo(6, 1)
  })
})

describe('the twelfth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC12}.mdx`), 'utf8')

  it('states the worked example’s current, terminal voltage and cross-check', () => {
    expect(mdx).toContain('I = \\frac{\\varepsilon}{R + r} = \\frac{6}{2.5 + 0.5} = 2\\ \\text{A}')
    expect(mdx).toContain('V = \\varepsilon - I r = 6 - 2 \\times 0.5 = 5\\ \\text{V}')
    expect(mdx).toContain('I R = 2 \\times 2.5 = 5\\ \\text{V} \\quad \\checkmark')
  })

  it('states the short-circuit current worked example (12 A)', () => {
    expect(currentWithInternalResistance(6, 0, 0.5)).toBe(12)
    expect(mdx).toContain('I_{short} = \\frac{\\varepsilon}{r} = \\frac{6}{0.5} = 12\\ \\text{A}')
  })
})

describe('the twelfth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC12)

  const expected: Record<string, number> = {
    ei1: currentWithInternalResistance(6, 2.5, 0.5),
    ei2: terminalVoltage(6, currentWithInternalResistance(6, 2.5, 0.5), 0.5),
    ei3: currentWithInternalResistance(12, 5, 1),
    ei4: currentWithInternalResistance(6, 0, 0.5),
    ei5: currentWithInternalResistance(9, 2.7, 0.3),
    ei6: terminalVoltage(9, currentWithInternalResistance(9, 2.7, 0.3), 0.3),
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('lineFromTwoPoints', () => {
  it('recovers slope and intercept exactly for a simple line', () => {
    const { slope, intercept } = lineFromTwoPoints(2, 8, 5, 5)
    expect(slope).toBe(-1)
    expect(intercept).toBe(10)
  })

  it('reproduces the emf/r cell from the previous lesson from two different data points', () => {
    const { slope, intercept } = lineFromTwoPoints(0.5, 5.75, 2.5, 4.75)
    expect(slope).toBe(-0.5)
    expect(Math.abs(slope)).toBe(0.5)
    expect(intercept).toBe(6)
  })
})

describe('terminal-voltage-graphs formulas', () => {
  it('the lesson’s own two data points (1,5.5) and (3,4.5) give r=0.5, emf=6 — matching the prior lesson', () => {
    const { slope, intercept } = lineFromTwoPoints(1, 5.5, 3, 4.5)
    expect(slope).toBe(-0.5)
    expect(Math.abs(slope)).toBe(0.5)
    expect(intercept).toBe(6)
  })
})

describe('the thirteenth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC13}.mdx`), 'utf8')

  it('states the worked example’s slope, r and emf', () => {
    expect(mdx).toContain('m = \\frac{4.5 - 5.5}{3 - 1} = \\frac{-1}{2} = -0.5')
    expect(mdx).toContain('r = |{-0.5}| = 0.5\\ \\Omega')
    expect(mdx).toContain('\\varepsilon = V_1 - m I_1 = 5.5 - (-0.5)(1) = 6\\ \\text{V}')
    expect(mdx).toContain('V_2 = \\varepsilon + m I_2 = 6 + (-0.5)(3) = 4.5\\ \\text{V} \\quad \\checkmark')
  })
})

describe('the thirteenth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC13)

  const line1 = lineFromTwoPoints(2, 8, 5, 5)
  const line2 = lineFromTwoPoints(0.5, 5.75, 2.5, 4.75)

  const expected: Record<string, number> = {
    tv1: line1.slope,
    tv2: Math.abs(line1.slope),
    tv3: line1.intercept,
    tv4: line2.slope,
    tv5: Math.abs(line2.slope),
    tv6: line2.intercept,
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('cells-aiding-opposing formulas', () => {
  it('matching poles: emf adds, internal resistance adds, same as any series resistors', () => {
    const emfTotal = seriesEmf([6, 3])
    expect(emfTotal).toBe(9)
    const rTotal = seriesResistance([0.5, 0.5])
    expect(rTotal).toBe(1)
    const I = emfTotal / (3.5 + rTotal)
    expect(I).toBe(2)
  })

  it('opposing poles: emf subtracts, but internal resistance is unaffected by orientation', () => {
    const emfNet = seriesEmf([6, -3])
    expect(emfNet).toBe(3)
    const rTotal = seriesResistance([0.5, 0.5])
    expect(rTotal).toBe(1) // identical to the matching-poles case — orientation never touches r
    const I = emfNet / (3.5 + rTotal)
    expect(I).toBeCloseTo(2 / 3, 10)
  })
})

describe('the fourteenth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC14}.mdx`), 'utf8')

  it('states the matching-poles worked example (9 V, 1 ohm, 2 A)', () => {
    expect(mdx).toContain('\\varepsilon_{total} = 6 + 3 = 9\\ \\text{V}')
    expect(mdx).toContain('r_{total} = 0.5 + 0.5 = 1\\ \\Omega')
    expect(mdx).toContain('I = \\frac{\\varepsilon_{total}}{R + r_{total}} = \\frac{9}{3.5 + 1} = 2\\ \\text{A}')
  })

  it('states the opposing-poles worked example (3 V net, same 1 ohm, 2/3 A)', () => {
    expect(mdx).toContain('\\varepsilon_{net} = |6 - 3| = 3\\ \\text{V}')
    expect(mdx).toContain(
      'I = \\frac{\\varepsilon_{net}}{R + r_{total}} = \\frac{3}{3.5 + 1} = \\frac{2}{3}\\ \\text{A} \\approx 0.67\\ \\text{A}',
    )
  })
})

describe('the fourteenth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC14)

  const expected: Record<string, number> = {
    ca1: seriesEmf([6, 3]),
    ca2: seriesResistance([0.5, 0.5]),
    ca3: seriesEmf([6, 3]) / (3.5 + seriesResistance([0.5, 0.5])),
    ca4: Math.abs(seriesEmf([6, -3])),
    ca5: seriesResistance([0.5, 0.5]),
    ca6: seriesEmf([6, -3]) / (3.5 + seriesResistance([0.5, 0.5])),
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('kirchhoff-current-law formulas', () => {
  it('a junction with two branches in and one out balances (5+2=7)', () => {
    expect(5 + 2).toBe(7)
  })

  it('a junction with two in and two out balances (6+4 = 7+3)', () => {
    const i3 = 6 + 4 - 3
    expect(i3).toBe(7)
    expect(6 + 4).toBe(i3 + 3)
  })

  it('the lesson’s own circuit: 12 V across 4/6 ohm branches gives 3 A + 2 A = 5 A total', () => {
    const i1 = 12 / 4
    const i2 = 12 / 6
    expect(i1).toBe(3)
    expect(i2).toBe(2)
    expect(i1 + i2).toBe(5)
  })
})

describe('the fifteenth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC15}.mdx`), 'utf8')

  it('states the simple-junction worked example (I3 = 7 A)', () => {
    expect(mdx).toContain('I_3 = 5 + 2 = 7\\ \\text{A}')
  })

  it('states the multi-branch junction worked example (I3 = 7 A from 6+4=I3+3)', () => {
    expect(mdx).toContain('6 + 4 = I_3 + 3 \\;\\Rightarrow\\; I_3 = 7\\ \\text{A}')
  })
})

describe('the fifteenth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC15)

  const expected: Record<string, number> = {
    kcl1: 5 + 2,
    kcl2: 6 + 9 - 10,
    kcl3: 8 - 3,
    kcl4: 12 / 4,
    kcl5: 12 / 6,
    kcl6: 12 / 4 + 12 / 6,
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})

describe('kirchhoff-voltage-law formulas', () => {
  it('single-cell loop: 10 - I(0.2+1.8+3) = 0 gives I = 2 A', () => {
    const rTotal = seriesResistance([0.2, 1.8, 3])
    const I = 10 / rTotal
    expect(I).toBe(2)
    expect(I * rTotal).toBe(10) // sum of IR drops equals the emf, per KVL
  })

  it('two-cell loop reproduces the cells-aiding-opposing result via KVL directly', () => {
    const emfTotal = seriesEmf([6, 3])
    const rTotal = seriesResistance([0.5, 0.5, 3.5])
    const I = emfTotal / rTotal
    expect(I).toBe(2)
    expect(I * rTotal).toBe(emfTotal)
  })
})

describe('the sixteenth lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC16}.mdx`), 'utf8')

  it('states the single-cell worked example (I = 2 A)', () => {
    expect(mdx).toContain('10 - I(0.2 + 1.8 + 3) = 0')
    expect(mdx).toContain('I = \\frac{10}{5} = 2\\ \\text{A}')
  })

  it('states the two-cell worked example (I = 2 A)', () => {
    expect(mdx).toContain('6 + 3 - I(0.5 + 0.5 + 3.5) = 0')
    expect(mdx).toContain('I = \\frac{9}{4.5} = 2\\ \\text{A}')
  })
})

describe('the sixteenth lesson’s exercise answers are the values the formulas give', () => {
  const checks = readExercises(TOPIC16)

  const r1 = seriesResistance([0.2, 1.8, 3])
  const r2 = seriesResistance([0.5, 0.5, 3.5])

  const expected: Record<string, number> = {
    kvl1: 10 / r1,
    kvl2: (10 / r1) * 3,
    kvl3: (10 / r1) * r1,
    kvl4: seriesEmf([6, 3]) / r2,
    kvl5: (seriesEmf([6, 3]) / r2) * 3.5,
    kvl6: (seriesEmf([6, 3]) / r2) * r2,
  }

  it('every numeric answer is within its own stated tolerance', () => {
    for (const [id, truth] of Object.entries(expected)) {
      const check = checks.get(id)
      expect(check, `${id} missing`).toBeDefined()
      expect(check!.type).toBe('numeric')
      const stated = check!.value as number
      const tolerance = check!.tolerance ?? 0
      expect(
        Math.abs(stated - truth),
        `${id}: answer ${stated} is off from the true ${truth} by more than tolerance ${tolerance}`,
      ).toBeLessThanOrEqual(tolerance)
    }
  })
})
