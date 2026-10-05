import type { LearningEvent } from './events'
import type { TopicId } from './ids'

/**
 * Derived progress state. Nothing here is stored — it is `reduce(events)`, recomputed from the
 * log. That is what keeps the log authoritative and makes new metrics free to add.
 */

export type Verdict = 'correct' | 'partial' | 'incorrect'

export interface ExerciseProgress {
  readonly exerciseId: string
  readonly attempts: number
  readonly lastAnswer?: string
  readonly lastExplanation?: string
  readonly autoVerdict?: 'correct' | 'incorrect' | 'unverified'
  readonly tutorVerdict?: Verdict
  readonly feedback?: string
  readonly solutionRevealed: boolean
  /** Waiting on me: submitted, not yet graded, and not settled by the auto-checker. */
  readonly awaitingReview: boolean
  readonly lastActivityAt?: string
}

export interface TopicProgress {
  readonly topicId: TopicId
  readonly viewed: boolean
  readonly checkpointPassed: boolean
  readonly exercises: ReadonlyMap<string, ExerciseProgress>
  readonly notes: readonly { ts: string; body: string }[]
  readonly firstViewedAt?: string
  readonly lastActivityAt?: string
}

export interface ProgressState {
  readonly topics: ReadonlyMap<TopicId, TopicProgress>
  readonly eventCount: number
  readonly lastActivityAt?: string
}

interface MutableTopic {
  topicId: TopicId
  viewed: boolean
  checkpointPassed: boolean
  exercises: Map<string, ExerciseProgress>
  notes: { ts: string; body: string }[]
  firstViewedAt?: string
  lastActivityAt?: string
}

const emptyExercise = (exerciseId: string): ExerciseProgress => ({
  exerciseId,
  attempts: 0,
  solutionRevealed: false,
  awaitingReview: false,
})

export function reduceEvents(events: readonly LearningEvent[]): ProgressState {
  const topics = new Map<TopicId, MutableTopic>()
  let lastActivityAt: string | undefined

  const topicOf = (id: string): MutableTopic => {
    const key = id as TopicId
    let t = topics.get(key)
    if (!t) {
      t = {
        topicId: key,
        viewed: false,
        checkpointPassed: false,
        exercises: new Map(),
        notes: [],
      }
      topics.set(key, t)
    }
    return t
  }

  for (const event of events) {
    const topic = topicOf(event.topicId)
    topic.lastActivityAt = event.ts
    lastActivityAt = event.ts

    switch (event.type) {
      case 'topic.viewed': {
        topic.viewed = true
        topic.firstViewedAt ??= event.ts
        break
      }
      case 'attempt.submitted': {
        const prev = topic.exercises.get(event.exerciseId) ?? emptyExercise(event.exerciseId)
        topic.exercises.set(event.exerciseId, {
          ...prev,
          attempts: prev.attempts + 1,
          lastAnswer: event.answer,
          ...(event.explanation !== undefined ? { lastExplanation: event.explanation } : {}),
          autoVerdict: event.autoVerdict,
          // A new submission supersedes any earlier grade.
          ...(prev.tutorVerdict !== undefined ? { tutorVerdict: undefined } : {}),
          ...(prev.feedback !== undefined ? { feedback: undefined } : {}),
          awaitingReview: event.autoVerdict !== 'correct',
          lastActivityAt: event.ts,
        })
        break
      }
      case 'attempt.graded': {
        const prev = topic.exercises.get(event.exerciseId) ?? emptyExercise(event.exerciseId)
        topic.exercises.set(event.exerciseId, {
          ...prev,
          tutorVerdict: event.verdict,
          feedback: event.feedback,
          awaitingReview: false,
          lastActivityAt: event.ts,
        })
        break
      }
      case 'solution.revealed': {
        const prev = topic.exercises.get(event.exerciseId) ?? emptyExercise(event.exerciseId)
        topic.exercises.set(event.exerciseId, { ...prev, solutionRevealed: true })
        break
      }
      case 'checkpoint.passed': {
        topic.checkpointPassed = true
        break
      }
      case 'note.added': {
        topic.notes.push({ ts: event.ts, body: event.body })
        break
      }
    }
  }

  const frozen = new Map<TopicId, TopicProgress>()
  for (const [id, t] of topics) {
    frozen.set(id, {
      topicId: t.topicId,
      viewed: t.viewed,
      checkpointPassed: t.checkpointPassed,
      exercises: t.exercises,
      notes: t.notes,
      ...(t.firstViewedAt !== undefined ? { firstViewedAt: t.firstViewedAt } : {}),
      ...(t.lastActivityAt !== undefined ? { lastActivityAt: t.lastActivityAt } : {}),
    })
  }

  return {
    topics: frozen,
    eventCount: events.length,
    ...(lastActivityAt !== undefined ? { lastActivityAt } : {}),
  }
}

export const EMPTY_PROGRESS: ProgressState = { topics: new Map(), eventCount: 0 }

/**
 * Mastery for one topic, in [0, 1].
 *
 * Deliberately simple and explainable: a topic is mastered when its checkpoint is passed;
 * short of that, credit is the share of exercises settled correct, with partials at half weight.
 * Reading the lesson alone earns a small floor so the navigator shows movement.
 */
export function topicMastery(progress: TopicProgress | undefined, exerciseCount: number): number {
  if (!progress) return 0
  if (progress.checkpointPassed) return 1

  if (exerciseCount === 0) return progress.viewed ? 0.5 : 0

  let credit = 0
  for (const ex of progress.exercises.values()) {
    const settled = ex.tutorVerdict ?? (ex.autoVerdict === 'correct' ? 'correct' : undefined)
    if (settled === 'correct') credit += 1
    else if (settled === 'partial') credit += 0.5
  }

  const earned = credit / exerciseCount
  const floor = progress.viewed ? 0.05 : 0
  return Math.min(1, Math.max(floor, earned))
}

/** Every exercise still sitting in my queue, across all topics. */
export function pendingReviews(
  state: ProgressState,
): { topicId: TopicId; exerciseId: string; since?: string }[] {
  const out: { topicId: TopicId; exerciseId: string; since?: string }[] = []
  for (const [topicId, topic] of state.topics) {
    for (const ex of topic.exercises.values()) {
      if (ex.awaitingReview) {
        out.push({
          topicId,
          exerciseId: ex.exerciseId,
          ...(ex.lastActivityAt !== undefined ? { since: ex.lastActivityAt } : {}),
        })
      }
    }
  }
  return out
}

/**
 * The single topic most recently touched — by a view, a submitted attempt, a grade, anything that
 * bumps `TopicProgress.lastActivityAt`. This is what "continue where I left off" means: not the
 * next unfinished lesson in the syllabus, but literally the lesson that was last open, the way a
 * game remembers which level you were on rather than suggesting the next one. `undefined` when
 * nothing has ever been touched.
 *
 * Duplicated from `@physics/core`'s copy rather than imported, for the same reason the rest of
 * this file is: a plain structural type here is assignable either way, but this keeps the whole
 * reducer — and everything derived from it — declared once, locally, the way this file already
 * works.
 */
export function mostRecentTopic(state: ProgressState): TopicId | undefined {
  let best: { topicId: TopicId; lastActivityAt: string } | undefined
  for (const topic of state.topics.values()) {
    if (!topic.lastActivityAt) continue
    if (!best || topic.lastActivityAt > best.lastActivityAt) {
      best = { topicId: topic.topicId, lastActivityAt: topic.lastActivityAt }
    }
  }
  return best?.topicId
}
