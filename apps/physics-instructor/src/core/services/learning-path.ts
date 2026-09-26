import type { TopicId } from '../domain/ids'
import { topicMastery, type ProgressState } from '../domain/progress'
import type { Syllabus, Topic } from '../domain/syllabus'

/**
 * Turns the prerequisite graph plus the event log into what the navigator renders:
 * whether each topic is locked, ready, in progress or done, and what to do next.
 */

export type TopicStatus = 'locked' | 'ready' | 'in-progress' | 'awaiting-review' | 'complete'

export interface TopicView {
  readonly topic: Topic
  readonly status: TopicStatus
  readonly mastery: number
  /** Prerequisites not yet complete — shown on a locked topic to explain why. */
  readonly blockedBy: readonly Topic[]
  readonly awaitingReviewCount: number
}

function isComplete(progress: ProgressState, topicId: TopicId): boolean {
  return progress.topics.get(topicId)?.checkpointPassed ?? false
}

/**
 * Status for every topic in a syllabus.
 *
 * `exerciseCounts` comes from the content repository; topics missing from it are treated as
 * having no exercises, which keeps an unauthored topic from looking broken.
 */
export function buildTopicViews(
  syllabus: Syllabus,
  progress: ProgressState,
  exerciseCounts: ReadonlyMap<TopicId, number>,
  allTopics: ReadonlyMap<TopicId, Topic> = syllabus.topics,
): Map<TopicId, TopicView> {
  const views = new Map<TopicId, TopicView>()

  for (const topic of syllabus.topics.values()) {
    const tp = progress.topics.get(topic.id)
    const mastery = topicMastery(tp, exerciseCounts.get(topic.id) ?? 0)

    const blockedBy = topic.requires
      .filter((req) => !isComplete(progress, req))
      .map((req) => allTopics.get(req))
      .filter((t): t is Topic => t !== undefined)

    const awaitingReviewCount = tp
      ? [...tp.exercises.values()].filter((e) => e.awaitingReview).length
      : 0

    let status: TopicStatus
    if (tp?.checkpointPassed) status = 'complete'
    else if (awaitingReviewCount > 0) status = 'awaiting-review'
    else if (blockedBy.length > 0) status = 'locked'
    else if (tp?.viewed || (tp?.exercises.size ?? 0) > 0) status = 'in-progress'
    else status = 'ready'

    views.set(topic.id, { topic, status, mastery, blockedBy, awaitingReviewCount })
  }

  return views
}

/**
 * What to open next: the furthest-along unfinished topic, preferring work already started,
 * then the first unlocked topic in authored order. Returns null once everything is complete.
 */
export function nextTopic(views: ReadonlyMap<TopicId, TopicView>, order: readonly TopicId[]): TopicView | null {
  const inOrder = order.map((id) => views.get(id)).filter((v): v is TopicView => v !== undefined)

  return (
    inOrder.find((v) => v.status === 'in-progress') ??
    inOrder.find((v) => v.status === 'awaiting-review') ??
    inOrder.find((v) => v.status === 'ready') ??
    null
  )
}

export interface SyllabusStats {
  readonly total: number
  readonly complete: number
  readonly inProgress: number
  readonly locked: number
  readonly awaitingReview: number
  /** Mean mastery across all topics, in [0, 1]. */
  readonly overallMastery: number
}

export function summarise(views: ReadonlyMap<TopicId, TopicView>): SyllabusStats {
  const all = [...views.values()]
  const total = all.length
  const sum = all.reduce((acc, v) => acc + v.mastery, 0)

  return {
    total,
    complete: all.filter((v) => v.status === 'complete').length,
    inProgress: all.filter((v) => v.status === 'in-progress').length,
    locked: all.filter((v) => v.status === 'locked').length,
    awaitingReview: all.filter((v) => v.status === 'awaiting-review').length,
    overallMastery: total === 0 ? 0 : sum / total,
  }
}
