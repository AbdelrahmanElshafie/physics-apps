import { threadFor } from '@physics/tutor-bridge'
import type { AnswerChecker, AutoVerdict, OutboundMessage, ProgressRepository, TutorTransport } from '@core/ports'
import { needsTutorReview, type Exercise, type LearningEvent, type TopicId } from '@core/domain'

export interface Clock {
  now(): Date
}
export interface IdGenerator {
  next(): string
}

export interface SubmitAttemptDeps {
  readonly progress: ProgressRepository
  readonly checker: AnswerChecker
  readonly tutor: TutorTransport
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
  /** True when the attempt was forwarded to the instructor's queue for review. */
  readonly awaitingReview: boolean
}

/**
 * Records an attempt: check what can be checked, log the event, and escalate to the instructor
 * when the answer needs judgement.
 *
 * The one rule that matters: an `unverified` result is never reported as wrong — the checker
 * simply has nothing to say, so it goes to the instructor. `explain.required` also always
 * escalates, even when the value itself checks out, because the reasoning is the thing being
 * taught, not the number.
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

  const awaitingReview = needsTutorReview(exercise) || outcome.verdict !== 'correct'

  if (awaitingReview) {
    const message: OutboundMessage = {
      threadId: threadFor({ topicId, exerciseId: exercise.id }),
      body: buildReviewRequest(exercise, answer, explanation, outcome.verdict),
      context: { topicId, exerciseId: exercise.id, draftAnswer: answer },
    }
    await deps.tutor.send(message)
  }

  return {
    attemptId,
    autoVerdict: outcome.verdict,
    ...(outcome.detail !== undefined ? { detail: outcome.detail } : {}),
    awaitingReview,
  }
}

/** Records the instructor's grade for an attempt. Called from the tutor CLI. */
export async function recordGrade(
  deps: Pick<SubmitAttemptDeps, 'progress' | 'clock' | 'ids'>,
  input: {
    topicId: TopicId
    exerciseId: string
    attemptId: string
    verdict: 'correct' | 'partial' | 'incorrect'
    feedback: string
    gradedBy: 'tutor' | 'auto'
  },
): Promise<void> {
  await deps.progress.append({
    v: 1,
    id: deps.ids.next(),
    ts: deps.clock.now().toISOString(),
    type: 'attempt.graded',
    ...input,
  })
}

function buildReviewRequest(
  exercise: Exercise,
  answer: string,
  explanation: string | undefined,
  verdict: AutoVerdict,
): string {
  const lines = [
    `من فضلك راجع إجابتي على ${exercise.label ?? exercise.id}.`,
    '',
    `السؤال: ${exercise.prompt}`,
    `إجابتي: ${answer || '(فاضية)'}`,
  ]
  if (explanation) lines.push(`تفسيري: ${explanation}`)
  lines.push(
    '',
    verdict === 'unverified'
      ? 'المصحح التلقائي مقدرش يحكم على الإجابة دي.'
      : `المصحح التلقائي قال: ${verdict}.`,
  )
  return lines.join('\n')
}
