import fs from 'node:fs'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { describe, expect, it } from 'vitest'

import {
  conductivity,
  currentFromCharge,
  electronCount,
  parallelResistance,
  potentialDifference,
  potentialDifferenceBetweenPoints,
  powerFromVI,
  resistanceFromGeometry,
  resistanceFromOhmsLaw,
  seriesResistance,
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
