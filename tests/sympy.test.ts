import { afterAll, describe, expect, it } from 'vitest'

import { CompositeAnswerChecker } from '@adapters/checker/composite'
import { RulesAnswerChecker } from '@adapters/checker/rules'
import { SympyAnswerChecker } from '@adapters/checker/sympy'
import type { Check } from '@core/domain'
import type { AnswerChecker, CheckOutcome } from '@core/ports'

/**
 * These exercise the real Python worker rather than a stub, because the whole value of the
 * adapter is whether SymPy actually settles the cases the rules checker cannot. A mock would
 * only assert that I wired my own assumptions together.
 *
 * If Python or SymPy is missing the suite still has to pass — the adapter is required to degrade
 * to `unverified`, and that degradation is itself asserted below.
 */

const sympy = new SympyAnswerChecker()
const composite = new CompositeAnswerChecker(new RulesAnswerChecker(), sympy)

afterAll(() => sympy.dispose())

// Probe once so the tests can distinguish "wrong answer" from "worker absent".
const workerUp = await sympy.equal('1', '1').then((r) => r === true)

const verdict = async (c: AnswerChecker, check: Check, answer: string) =>
  (await c.check(check, answer)).verdict

describe('SympyAnswerChecker', () => {
  it.runIf(workerUp)('settles a root the rules checker cannot parse', async () => {
    expect(await sympy.equal(String.raw`\sqrt{9}`, '3')).toBe(true)
  })

  it.runIf(workerUp)('evaluates unevaluated arithmetic', async () => {
    expect(await sympy.equal('2+1', '3')).toBe(true)
  })

  it.runIf(workerUp)('recognises a factored form as equal to its expansion', async () => {
    expect(await sympy.equal('(x-1)(x+1)', 'x^2-1')).toBe(true)
  })

  it.runIf(workerUp)('accepts the Dirac exponent written any of the usual ways', async () => {
    // Topic 11.1 Q8 asks for gamma = sqrt(1 - (Z alpha)^2). Its `accept` list cannot enumerate
    // every spelling a reader might use, so the grade has to rest on SymPy deciding equivalence
    // rather than on the list. A reordered product is a right answer and must not be marked wrong.
    const expected = String.raw`\sqrt{1-(Z\alpha)^2}`

    for (const spelling of [
      String.raw`\sqrt{1 - Z^{2}\alpha^{2}}`,
      String.raw`\sqrt{1-\alpha^2 Z^2}`,
      String.raw`\sqrt{1 - \alpha^{2} Z^{2}}`,
    ]) {
      expect(await sympy.equal(spelling, expected), spelling).toBe(true)
    }

    // And a plausible near-miss is still a miss.
    expect(await sympy.equal(String.raw`\sqrt{1+(Z\alpha)^2}`, expected)).toBe(false)
  })

  it.runIf(workerUp)('recognises a genuine mismatch', async () => {
    expect(await sympy.equal('2+1', '4')).toBe(false)
  })

  it.runIf(workerUp)('ignores decoration that carries no meaning', async () => {
    expect(await sympy.equal(String.raw`\left( 2 + 1 \right)`, '3')).toBe(true)
    expect(await sympy.equal('$3$', '3')).toBe(true)
  })

  it.runIf(workerUp)('treats a leading equals sign as a continuation, not a syntax error', async () => {
    // Derivation steps are routinely written as "= 3 + 8".
    expect(await sympy.equal('= 3 + 8', '11')).toBe(true)
  })

  it.runIf(workerUp)('returns null rather than guessing on unparseable input', async () => {
    expect(await sympy.equal('this is not maths at all', '3')).toBeNull()
  })

  it('degrades to unverified when it cannot decide', async () => {
    // Holds whether or not the worker is running: a check with no comparable value is never
    // something the symbolic stage should claim a verdict on.
    expect(await verdict(sympy, { type: 'tutor' }, 'anything')).toBe('unverified')
  })
})

describe('CompositeAnswerChecker', () => {
  it('lets the rules checker settle what it can, without consulting SymPy', async () => {
    const check: Check = { type: 'numeric-list', value: [6, 2], tolerance: 0 }
    expect(await verdict(composite, check, '(6, 2)')).toBe('correct')
  })

  it.runIf(workerUp)('falls through to SymPy for what the rules cannot parse', async () => {
    const check: Check = { type: 'numeric', value: 3, tolerance: 0 }
    // The rules checker returns unverified for a root; SymPy settles it.
    expect(await verdict(composite, check, String.raw`\sqrt{9}`)).toBe('correct')
  })

  it.runIf(workerUp)('settles symbolic equivalence end to end', async () => {
    const check: Check = { type: 'symbolic', value: 'x^2-1' }
    expect(await verdict(composite, check, '(x-1)(x+1)')).toBe('correct')
  })

  it('stops at the first definite verdict rather than letting a later checker overturn it', async () => {
    const decisive: AnswerChecker = {
      check: async (): Promise<CheckOutcome> => ({ verdict: 'incorrect', detail: 'no' }),
    }
    let consulted = false
    const shouldNotRun: AnswerChecker = {
      check: async (): Promise<CheckOutcome> => {
        consulted = true
        return { verdict: 'correct' }
      },
    }

    const chain = new CompositeAnswerChecker(decisive, shouldNotRun)
    expect(await verdict(chain, { type: 'numeric', value: 1, tolerance: 0 }, '1')).toBe('incorrect')
    expect(consulted).toBe(false)
  })

  it('survives a checker that throws', async () => {
    const broken: AnswerChecker = {
      check: async () => {
        throw new Error('boom')
      },
    }
    const chain = new CompositeAnswerChecker(broken, new RulesAnswerChecker())
    expect(await verdict(chain, { type: 'numeric', value: 3, tolerance: 0 }, '3')).toBe('correct')
  })
})
