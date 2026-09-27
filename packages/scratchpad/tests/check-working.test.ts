import { describe, expect, it } from 'vitest'
import type { AnswerChecker, CheckOutcome } from '@physics/core/ports'
import type { Check } from '@physics/core/domain'

import { checkWorking } from '../src/check-working'

/**
 * A scriptable fake checker, since RulesAnswerChecker deliberately returns `unverified` for every
 * `symbolic` check (real symbolic equivalence needs a CAS, out of scope for the rules adapter) —
 * checkWorking's own branches (follows/broken/unchecked) need a checker that can actually decide.
 */
function fakeChecker(verdicts: CheckOutcome['verdict'][]): AnswerChecker {
  let i = 0
  return {
    async check(_check: Check, _answer: string): Promise<CheckOutcome> {
      const verdict = verdicts[i] ?? 'unverified'
      i += 1
      return { verdict }
    },
  }
}

const step = (id: string, latex: string) => ({ id, latex })

describe('checkWorking', () => {
  it('the first non-empty step is "start", with nothing to compare against', async () => {
    const report = await checkWorking([step('s1', 'x = 1')], fakeChecker([]))
    expect(report.verdicts).toEqual([{ stepId: 's1', index: 0, status: 'start' }])
    expect(report.firstBreak).toBeNull()
  })

  it('a step that follows the previous one is marked "follows"', async () => {
    const report = await checkWorking(
      [step('s1', 'x = 1'), step('s2', 'x + 1 = 2')],
      fakeChecker(['correct']),
    )
    expect(report.verdicts[1]).toMatchObject({ status: 'follows' })
    expect(report.checked).toBe(1)
    expect(report.firstBreak).toBeNull()
  })

  it('a step that does not follow is marked "broken", and firstBreak records its index', async () => {
    const report = await checkWorking(
      [step('s1', 'x = 1'), step('s2', 'x = 2'), step('s3', 'x = 3')],
      fakeChecker(['incorrect', 'incorrect']),
    )
    expect(report.verdicts[1]).toMatchObject({ status: 'broken' })
    expect(report.firstBreak).toBe(1)
    // The break is recorded once, at the first offending index, even though step 3 also breaks.
    expect(report.verdicts[2]).toMatchObject({ status: 'broken' })
  })

  it('a step the checker cannot parse is "unchecked", never "broken"', async () => {
    const report = await checkWorking(
      [step('s1', 'x = 1'), step('s2', 'this is prose, not maths')],
      fakeChecker(['unverified']),
    )
    expect(report.verdicts[1]).toMatchObject({ status: 'unchecked' })
    expect(report.unchecked).toBe(1)
    expect(report.firstBreak).toBeNull()
  })

  it('a blank step is "empty" and does not become the comparison baseline for the next step', async () => {
    const report = await checkWorking(
      [step('s1', 'x = 1'), step('s2', '   '), step('s3', 'x + 1 = 2')],
      fakeChecker(['correct']),
    )
    expect(report.verdicts[1]).toMatchObject({ status: 'empty' })
    // s3 is compared against s1 (the last real step), not against the blank s2.
    expect(report.verdicts[2]).toMatchObject({ status: 'follows' })
  })
})
