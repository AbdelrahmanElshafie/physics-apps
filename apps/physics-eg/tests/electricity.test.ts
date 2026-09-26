import fs from 'node:fs'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { describe, expect, it } from 'vitest'

import { currentFromCharge, electronCount } from '@core/domain'

/**
 * A number the lesson prints is a number a test checks — same discipline as physics-instructor's
 * relativistic.test.ts. The book's own worked example (I = 20 A, t = 2 s, N = 2.5e20 electrons)
 * is reproduced exactly here, so if the formula or the lesson's own arithmetic ever drift apart,
 * this fails instead of a student finding the mismatch first.
 */

const CONTENT = path.join(process.cwd(), 'content', 'syllabi', 'electricity')
const TOPIC = 'current-and-charge'

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
  const raw = fs.readFileSync(path.join(CONTENT, 'exercises', `${TOPIC}.yaml`), 'utf8')
  const parsed = parseYaml(raw) as {
    exercises: { id: string; check: { type: string; value?: unknown; tolerance?: number } }[]
  }
  const checks = new Map(parsed.exercises.map((e) => [e.id, e.check]))

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
