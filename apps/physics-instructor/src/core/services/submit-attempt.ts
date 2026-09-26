import type { Exercise } from '../domain/exercise'
import { needsTutorReview } from '../domain/exercise'
import type { LearningEvent } from '../domain/events'
import type { TopicId } from '../domain/ids'
import type { AnswerChecker, AutoVerdict } from '../ports/answer-checker'
import type { ProgressRepository } from '../ports/progress-repository'
import type { OutboundMessage, TutorTransport } from '../ports/tutor-transport'
import { asThreadId } from '../domain/ids'

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
  /** True when the attempt was forwarded to me for review. */
  readonly queuedForTutor: boolean
}

/**
 * Records an attempt: check what can be checked, log the event, and escalate to the tutor when
 * the answer needs judgement.
 *
 * Two rules matter here. An `unverified` result is never reported as wrong — the checker simply
 * has nothing to say, so it goes to me. And an exercise demanding a written justification always
 * reaches me even when the value itself is right, because the reasoning is the thing being taught.
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

  // Escalate when judgement is required, or when the checker could not decide.
  const escalate = needsTutorReview(exercise) || outcome.verdict !== 'correct'
  if (escalate) {
    const message: OutboundMessage = {
      threadId: asThreadId(`${topicId}#${exercise.id}`),
      body: buildReviewRequest(exercise, answer, explanation, outcome.verdict),
      context: {
        topicId,
        exerciseId: exercise.id,
        draftAnswer: answer,
      },
    }
    await deps.tutor.send(message)
  }

  return {
    attemptId,
    autoVerdict: outcome.verdict,
    ...(outcome.detail !== undefined ? { detail: outcome.detail } : {}),
    queuedForTutor: escalate,
  }
}

function buildReviewRequest(
  exercise: Exercise,
  answer: string,
  explanation: string | undefined,
  verdict: AutoVerdict,
): string {
  const lines = [
    `Please review my answer to ${exercise.label ?? exercise.id}.`,
    '',
    `Question: ${exercise.prompt}`,
    `My answer: ${answer || '(blank)'}`,
  ]
  if (explanation) lines.push(`My reasoning: ${explanation}`)
  lines.push(
    '',
    verdict === 'unverified'
      ? 'The auto-checker could not judge this one.'
      : `Auto-checker says: ${verdict}.`,
  )
  return lines.join('\n')
}

/** Records my grade for an attempt. Called from the tutor CLI and from the API tutor in M3. */
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
