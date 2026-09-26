import type { Check } from '@physics/core/domain'
import type { AnswerChecker, CheckOutcome } from '@physics/core/ports'

/**
 * Tries each checker in turn until one reaches a verdict.
 *
 * The order encodes cost: the rule-based checker is synchronous and settles most answers, so the
 * symbolic worker is only consulted for what is left. `unverified` is the signal to keep going —
 * which is exactly why the port defines it as "I cannot judge this" rather than as a soft "no".
 *
 * A definite `incorrect` stops the chain. A later checker must not overturn an earlier one that
 * was confident, or the verdict would depend on ordering rather than on the mathematics.
 */
export class CompositeAnswerChecker implements AnswerChecker {
  private readonly checkers: readonly AnswerChecker[]

  constructor(...checkers: AnswerChecker[]) {
    this.checkers = checkers
  }

  async check(check: Check, answer: string): Promise<CheckOutcome> {
    let last: CheckOutcome = { verdict: 'unverified' }

    for (const checker of this.checkers) {
      try {
        const outcome = await checker.check(check, answer)
        if (outcome.verdict !== 'unverified') return outcome
        last = outcome
      } catch (error) {
        // One broken checker must not deny the learner the others.
        console.warn('[checker] A checker threw; continuing with the rest.', error)
      }
    }

    return last
  }
}
