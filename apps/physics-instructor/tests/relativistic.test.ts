import fs from 'node:fs'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { describe, expect, it } from 'vitest'

import {
  ALPHA,
  coulombBindingEnergy,
  diracExponent,
  fineStructure2p,
  lorentzFactor,
  relativisticKineticCorrectionRatio,
  RYDBERG_CM,
  smallOverLarge,
  sommerfeldFineStructureShift,
  sommerfeldTerm,
  speedOverC,
} from '@core/domain'

/**
 * Two kinds of check here.
 *
 * The first is that the formulas reproduce numbers that can be looked up independently — hydrogen's
 * 2p fine structure is 0.365 cm^-1 in any textbook, and getting that right is what makes the
 * Z = 42 extrapolation worth believing.
 *
 * The second, and the reason this file exists, is that the *lesson* and the *exercise answers* are
 * checked against the same functions. A table in prose drifts silently; a table a test reads does
 * not. If someone later edits 15.7% to 16% in the MDX, this fails.
 */

const CONTENT = path.join(process.cwd(), 'content', 'syllabi', 'nuclear-physics')
const TOPIC = 'm11.1-why-relativity-matters-for-atoms'
const TOPIC2 = 'm11.1-failures-of-the-schrodinger-equation'

/** Reads one topic's exercise file for one locale, keyed by exercise id. */
function readExercises(topic: string, locale: '' | '.ar') {
  const raw = fs.readFileSync(path.join(CONTENT, 'exercises', `${topic}${locale}.yaml`), 'utf8')
  const parsed = parseYaml(raw) as {
    exercises: { id: string; check: { type: string; value?: unknown; tolerance?: number } }[]
  }
  return new Map(parsed.exercises.map((e) => [e.id, e.check]))
}

describe('relativistic formulas, against known values', () => {
  it('reproduces the textbook 2p fine structure of hydrogen', () => {
    // 0.365 cm^-1 — the Lamb-shift-era measurement, quoted everywhere.
    expect(fineStructure2p(1)).toBeCloseTo(0.365, 3)
  })

  it('has hydrogen essentially non-relativistic and uranium not', () => {
    expect(speedOverC(1)).toBeCloseTo(0.0073, 4)
    expect(smallOverLarge(1)).toBeLessThan(0.004)

    expect(speedOverC(92)).toBeCloseTo(0.671, 3)
    expect(smallOverLarge(92)).toBeGreaterThan(0.38)
  })

  it('agrees with Z alpha / 2 for the small component at low Z', () => {
    // Expanding sqrt((1-gamma)/(1+gamma)) to leading order gives Z alpha / 2, with a relative
    // error of order (Z alpha)^2. Asserting that error bound rather than a fixed number of
    // decimals is what makes this a check on the physics instead of on the size of Z.
    for (const Z of [1, 2, 6, 26]) {
      const leadingOrder = (Z * ALPHA) / 2
      const relativeError = Math.abs(smallOverLarge(Z) - leadingOrder) / leadingOrder
      expect(relativeError).toBeLessThan((Z * ALPHA) ** 2)
    }
  })

  it('goes imaginary past Z alpha = 1 rather than clamping', () => {
    // Beyond Z ~ 137 the point-nucleus Dirac solution does not exist. Returning NaN says so;
    // clamping to zero would draw a confident, wrong curve.
    expect(diracExponent(138)).toBeNaN()
    expect(diracExponent(137)).not.toBeNaN()
  })

  it('scales fine structure as the fourth power', () => {
    expect(fineStructure2p(40) / fineStructure2p(6)).toBeCloseTo((40 / 6) ** 4, 6)
  })

  it('derives the 2p fine structure from the Sommerfeld shift at j = 1/2 and j = 3/2', () => {
    // fineStructure2p was introduced in the first lesson as a standalone formula. This lesson
    // traces it to sommerfeldFineStructureShift, the j-dependent term Schrodinger's equation
    // cannot write down. The two must agree exactly, not approximately — they are the same
    // physics, and a lesson that presents them as if they were different facts would be wrong.
    for (const Z of [1, 6, 40, 42, 92]) {
      const splitting =
        sommerfeldFineStructureShift(Z, 2, 0.5) - sommerfeldFineStructureShift(Z, 2, 1.5)
      expect(Math.abs(splitting)).toBeCloseTo(fineStructure2p(Z), 6)
    }
  })

  it('the missing kinetic-energy term is negligible at hydrogen and a few per cent at Mo', () => {
    expect(relativisticKineticCorrectionRatio(1) * 100).toBeLessThan(0.01)
    expect(relativisticKineticCorrectionRatio(42) * 100).toBeGreaterThan(2)
    expect(relativisticKineticCorrectionRatio(42) * 100).toBeLessThan(3)
  })

  it('reproduces the hydrogen ground-state binding energy', () => {
    // -109737.3 cm^-1 is the Rydberg energy itself, by definition of Ry — the textbook check.
    expect(coulombBindingEnergy(1, 1)).toBeCloseTo(-RYDBERG_CM, 4)
  })
})

describe('the lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC}.mdx`), 'utf8')
  const arabic = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC}.ar.mdx`), 'utf8')

  /** Each row of the Compare table in section 2, as the lesson prints it. */
  const TABLE: [number, string, string, string][] = [
    [1, '0.0073', '1.00003', '0.36%'],
    [6, '0.0438', '1.00096', '2.19%'],
    [26, '0.1897', '1.01850', '9.57%'],
    [40, '0.2919', '1.04553', '14.92%'],
    [42, '0.3065', '1.05056', '15.70%'],
    [92, '0.6714', '1.34928', '38.56%'],
  ]

  it.each(TABLE)('row Z=%i is what the formulas round to', (Z, beta, gammaL, qp) => {
    // Compare printed strings, not tolerances. A cell reading 0.307 where the value is 0.30649 is
    // simply the wrong rounding, and a tolerance window would wave it through.
    const dp = (s: string) => (s.split('.')[1]?.length ?? 0)

    expect(speedOverC(Z).toFixed(dp(beta))).toBe(beta)
    expect(lorentzFactor(Z).toFixed(dp(gammaL))).toBe(gammaL)

    const digits = qp.replace('%', '')
    expect(`${(smallOverLarge(Z) * 100).toFixed(dp(digits))}%`).toBe(qp)
  })

  it.each(TABLE)('row Z=%i appears in both languages', (Z, beta, gammaL, qp) => {
    for (const [name, source] of [
      ['english', mdx],
      ['arabic', arabic],
    ] as const) {
      expect(source, `${name} is missing v/c for Z=${Z}`).toContain(`'${beta}'`)
      expect(source, `${name} is missing the Lorentz factor for Z=${Z}`).toContain(`'${gammaL}'`)
      expect(source, `${name} is missing Q/P for Z=${Z}`).toContain(`'${qp}'`)
    }
  })

  it('quotes the peak contraction, which is 1 - gamma', () => {
    // The peak of P(r) sits at gamma/Z where the non-relativistic one sits at 1/Z, so the
    // contraction of the peak is exactly 1 - gamma. Section 3 states it as a percentage.
    for (const Z of [42, 92]) {
      const claim = `**${((1 - diracExponent(Z)) * 100).toFixed(1)}%**`
      expect(mdx, `english is missing the Z=${Z} contraction`).toContain(claim)
      expect(arabic, `arabic is missing the Z=${Z} contraction`).toContain(claim)
    }
  })

  it('quotes the molybdenum small component in the prose too', () => {
    // Section 3 repeats 15.7% in words; if the table were corrected and this were not, the lesson
    // would contradict itself a screen apart.
    const expected = `${(smallOverLarge(42) * 100).toFixed(1)}%`
    expect(mdx).toContain(`**${expected}**`)
    expect(arabic).toContain(`**${expected}**`)
  })
})

describe('the exercise answers are the values the formulas give', () => {
  const exercises = (locale: '' | '.ar') => readExercises(TOPIC, locale)

  const expected: Record<string, number> = {
    rel1: speedOverC(42),
    rel2: lorentzFactor(42),
    rel4: 69, // smallest integer Z with v/c > 0.5
    rel5: diracExponent(40),
    rel6: smallOverLarge(42) * 100,
    rel7: diracExponent(92),
    rel9: (40 / 6) ** 4,
    rel10: fineStructure2p(26),
  }

  for (const locale of ['', '.ar'] as const) {
    const label = locale === '' ? 'english' : 'arabic'

    it(`${label}: every numeric answer is within its own stated tolerance`, () => {
      const checks = exercises(locale)

      for (const [id, truth] of Object.entries(expected)) {
        const check = checks.get(id)
        expect(check, `${id} missing`).toBeDefined()
        expect(check!.type).toBe('numeric')

        const stated = check!.value as number
        const tolerance = check!.tolerance ?? 0
        expect(
          Math.abs(stated - truth),
          `${id}: answer ${stated} is ${Math.abs(stated - truth).toPrecision(3)} from the true ${truth.toPrecision(6)}, but the tolerance is only ${tolerance}`,
        ).toBeLessThanOrEqual(tolerance)
      }
    })
  }

  it('rel4 really is the smallest Z above half light speed', () => {
    expect(speedOverC(69)).toBeGreaterThan(0.5)
    expect(speedOverC(68)).toBeLessThan(0.5)
  })
})

describe('the second lesson quotes what the formulas give', () => {
  const mdx = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC2}.mdx`), 'utf8')
  const arabic = fs.readFileSync(path.join(CONTENT, 'lessons', `${TOPIC2}.ar.mdx`), 'utf8')

  /** Each row of the Compare table in section 3, as the lesson prints it. */
  const RATIO_TABLE: [number, string][] = [
    [1, '0.0013%'],
    [6, '0.0479%'],
    [26, '0.8999%'],
    [40, '2.1301%'],
    [42, '2.3484%'],
    [92, '11.2680%'],
  ]

  it.each(RATIO_TABLE)('the Z=%i kinetic-ratio row is what the formula rounds to', (Z, cell) => {
    const digits = cell.replace('%', '').split('.')[1]?.length ?? 0
    expect(`${(relativisticKineticCorrectionRatio(Z) * 100).toFixed(digits)}%`).toBe(cell)
  })

  it.each(RATIO_TABLE)('the Z=%i kinetic-ratio row appears in both languages', (Z, cell) => {
    for (const [name, source] of [
      ['english', mdx],
      ['arabic', arabic],
    ] as const) {
      expect(source, `${name} is missing the ratio for Z=${Z}`).toContain(`'${cell}'`)
    }
  })

  it('states the Mo ratio in prose, not only in the table', () => {
    // Section 3 repeats the figure in words at coarser (1 decimal place) rounding than the
    // table's 4; both mdx.test.ts and this file exist so no lesson repeats a number without a
    // test noticing if the two roundings ever disagree.
    const expected = `${(relativisticKineticCorrectionRatio(42) * 100).toFixed(1)}%`
    expect(mdx).toContain(`**${expected}**`)
    expect(arabic).toContain(`**${expected}**`)
  })
})

describe('the second lesson’s exercise answers are the values the formulas give', () => {
  const expected: Record<string, number> = {
    fail1: relativisticKineticCorrectionRatio(42) * 100,
    fail2: relativisticKineticCorrectionRatio(1) * 100,
    fail4: 87, // smallest integer Z with the p^4 ratio >= 10%
    fail5: sommerfeldTerm(3, 0.5),
    fail6: sommerfeldTerm(3, 2.5),
    fail7: fineStructure2p(40),
    fail11: relativisticKineticCorrectionRatio(92) * 100,
  }

  for (const locale of ['', '.ar'] as const) {
    const label = locale === '' ? 'english' : 'arabic'

    it(`${label}: every numeric answer is within its own stated tolerance`, () => {
      const checks = readExercises(TOPIC2, locale)

      for (const [id, truth] of Object.entries(expected)) {
        const check = checks.get(id)
        expect(check, `${id} missing`).toBeDefined()
        expect(check!.type).toBe('numeric')

        const stated = check!.value as number
        const tolerance = check!.tolerance ?? 0
        expect(
          Math.abs(stated - truth),
          `${id}: answer ${stated} is ${Math.abs(stated - truth).toPrecision(3)} from the true ${truth.toPrecision(6)}, but the tolerance is only ${tolerance}`,
        ).toBeLessThanOrEqual(tolerance)
      }
    })
  }

  it('fail4 really is the smallest Z where the p^4 ratio reaches 10%', () => {
    expect(relativisticKineticCorrectionRatio(87) * 100).toBeGreaterThanOrEqual(10)
    expect(relativisticKineticCorrectionRatio(86) * 100).toBeLessThan(10)
  })
})
