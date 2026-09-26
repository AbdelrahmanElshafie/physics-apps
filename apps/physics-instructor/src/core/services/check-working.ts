import type { ScratchStep } from '../domain/scratchpad'
import type { AnswerChecker } from '../ports/answer-checker'

/**
 * Checks a derivation for internal consistency.
 *
 * Nobody has told us the right answer — this is the learner's own working. What can be verified is
 * whether each line follows from the previous one, which is where algebra actually goes wrong:
 * a sign lost in step three, then five more steps built faithfully on top of it.
 *
 * Every step is compared against its predecessor for mathematical equality. The first line has
 * nothing to compare against, and a step the checker cannot parse is reported as unchecked rather
 * than broken — the same refusal-to-guess rule as everywhere else.
 */

export type StepStatus = 'start' | 'follows' | 'broken' | 'unchecked' | 'empty'

export interface StepVerdict {
  readonly stepId: string
  readonly index: number
  readonly status: StepStatus
  readonly detail?: string
}

export interface WorkingReport {
  readonly verdicts: readonly StepVerdict[]
  /** Index of the first step that does not follow, or null when nothing broke. */
  readonly firstBreak: number | null
  readonly checked: number
  readonly unchecked: number
}

export async function checkWorking(
  steps: readonly ScratchStep[],
  checker: AnswerChecker,
): Promise<WorkingReport> {
  const verdicts: StepVerdict[] = []
  let previous: ScratchStep | null = null
  let firstBreak: number | null = null
  let checked = 0
  let unchecked = 0

  for (const [index, step] of steps.entries()) {
    if (step.latex.trim().length === 0) {
      verdicts.push({ stepId: step.id, index, status: 'empty' })
      continue
    }

    if (!previous) {
      verdicts.push({ stepId: step.id, index, status: 'start' })
      previous = step
      continue
    }

    // Symbolic comparison against the previous line. The composite checker routes this to the
    // CAS; without one available it comes back unverified, which is reported honestly.
    const outcome = await checker.check({ type: 'symbolic', value: previous.latex }, step.latex)

    if (outcome.verdict === 'correct') {
      verdicts.push({ stepId: step.id, index, status: 'follows' })
      checked += 1
    } else if (outcome.verdict === 'incorrect') {
      verdicts.push({
        stepId: step.id,
        index,
        status: 'broken',
        detail: `This is not equal to step ${index}.`,
      })
      checked += 1
      firstBreak ??= index
    } else {
      verdicts.push({
        stepId: step.id,
        index,
        status: 'unchecked',
        detail: 'Could not verify this automatically.',
      })
      unchecked += 1
    }

    previous = step
  }

  return { verdicts, firstBreak, checked, unchecked }
}
