import type { AnswerChecker, AutoVerdict, ProgressRepository } from '@core/ports'
import type { Exercise, LearningEvent, TopicId } from '@core/domain'

export interface Clock {
  now(): Date
}
export interface IdGenerator {
  next(): string
}

export interface SubmitAttemptDeps {
  readonly progress: ProgressRepository
  readonly checker: AnswerChecker
  readonly clock: Clock
  readonly ids: IdGenerator
}

export interface SubmitAttemptInput {
  readonly topicId: TopicId
  readonly exercise: Exercise
  readonly answer: string
  readonly explanation?: string
}

export interface SubmitAttemptResult {
  readonly attemptId: string
  readonly autoVerdict: AutoVerdict
  readonly detail?: string
  /**
   * True when nobody has settled this one yet — the checker returned `unverified`, or the
   * exercise demands a written justification. There is no tutor transport in this app yet, so
   * "queued" means "sitting in the event log for a human to read", not "sent anywhere".
   */
  readonly awaitingReview: boolean
}

/**
 * Records an attempt: check what can be checked, log the event.
 *
 * The one rule that matters: an `unverified` result is never reported as wrong — the checker
 * simply has nothing to say. `needsTutorReview` (an exercise with `explain.required`) also leaves
 * it awaiting review even when the value itself checks out, because the reasoning is the thing
 * being taught, not the number.
 */
export async function submitAttempt(
  deps: SubmitAttemptDeps,
  input: SubmitAttemptInput,
): Promise<SubmitAttemptResult> {
  const { topicId, exercise, answer, explanation } = input
  const outcome = await deps.checker.check(exercise.check, answer)
  const attemptId = deps.ids.next()
  const ts = deps.clock.now().toISOString()

  const event: LearningEvent = {
    v: 1,
    id: deps.ids.next(),
    ts,
    type: 'attempt.submitted',
    topicId,
    exerciseId: exercise.id,
    attemptId,
    answer,
    ...(explanation !== undefined && explanation.length > 0 ? { explanation } : {}),
    autoVerdict: outcome.verdict,
  }
  await deps.progress.append(event)

  const awaitingReview = outcome.verdict !== 'correct' || (exercise.explain.required && explanation === undefined)

  return {
    attemptId,
    autoVerdict: outcome.verdict,
    ...(outcome.detail !== undefined ? { detail: outcome.detail } : {}),
    awaitingReview,
  }
}
