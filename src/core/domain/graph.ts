import type { TopicId } from './ids'
import type { Topic } from './syllabus'

/**
 * Prerequisite graph.
 *
 * Topics form a DAG, not a linear list. That is what lets the app say "you're ready for this"
 * versus "finish Clebsch-Gordan first", and lets a prerequisite point at another syllabus later
 * without reshaping anything.
 */

export interface GraphIssue {
  readonly kind: 'cycle' | 'missing-prerequisite'
  readonly topicId: TopicId
  readonly detail: string
  /** For cycles, the path that closes the loop. */
  readonly path?: readonly TopicId[]
}

/**
 * Depth-first cycle detection plus dangling-prerequisite detection.
 * Returns every distinct problem rather than throwing on the first, so `validate:content`
 * can report the whole picture in one pass.
 */
export function findGraphIssues(topics: ReadonlyMap<TopicId, Topic>): GraphIssue[] {
  const issues: GraphIssue[] = []
  const reportedCycles = new Set<string>()

  for (const [id, topic] of topics) {
    for (const req of topic.requires) {
      if (!topics.has(req)) {
        issues.push({
          kind: 'missing-prerequisite',
          topicId: id,
          detail: `"${id}" requires "${req}", which does not exist in any loaded syllabus.`,
        })
      }
    }
  }

  const WHITE = 0
  const GREY = 1
  const BLACK = 2
  const colour = new Map<TopicId, number>()
  const stack: TopicId[] = []

  const visit = (id: TopicId): void => {
    const state = colour.get(id) ?? WHITE
    if (state === BLACK) return

    if (state === GREY) {
      // Found a back edge: the cycle is the tail of the current stack from `id` onward.
      const start = stack.indexOf(id)
      const cycle = stack.slice(start).concat(id)
      // Normalise so the same loop reached from different entry points reports once.
      const key = [...cycle.slice(0, -1)].sort().join('>')
      if (!reportedCycles.has(key)) {
        reportedCycles.add(key)
        issues.push({
          kind: 'cycle',
          topicId: id,
          detail: `Prerequisite cycle: ${cycle.join(' -> ')}`,
          path: cycle,
        })
      }
      return
    }

    colour.set(id, GREY)
    stack.push(id)
    for (const req of topics.get(id)?.requires ?? []) {
      if (topics.has(req)) visit(req)
    }
    stack.pop()
    colour.set(id, BLACK)
  }

  for (const id of topics.keys()) visit(id)
  return issues
}

/**
 * Authored order, adjusted so prerequisites always precede dependents.
 * Kahn's algorithm, breaking ties by the authored `order` field so the result stays
 * predictable and close to how the syllabus reads. Topics inside a cycle are appended last.
 */
export function topologicalOrder(topics: ReadonlyMap<TopicId, Topic>): TopicId[] {
  const indegree = new Map<TopicId, number>()
  const dependents = new Map<TopicId, TopicId[]>()

  for (const id of topics.keys()) {
    indegree.set(id, 0)
    dependents.set(id, [])
  }
  for (const [id, topic] of topics) {
    for (const req of topic.requires) {
      if (!topics.has(req)) continue
      indegree.set(id, (indegree.get(id) ?? 0) + 1)
      dependents.get(req)!.push(id)
    }
  }

  const byOrder = (a: TopicId, b: TopicId) =>
    (topics.get(a)?.order ?? 0) - (topics.get(b)?.order ?? 0)

  const ready = [...indegree.entries()].filter(([, n]) => n === 0).map(([id]) => id).sort(byOrder)
  const result: TopicId[] = []

  while (ready.length > 0) {
    const id = ready.shift()!
    result.push(id)
    for (const dep of dependents.get(id) ?? []) {
      const next = (indegree.get(dep) ?? 1) - 1
      indegree.set(dep, next)
      if (next === 0) {
        ready.push(dep)
        ready.sort(byOrder)
      }
    }
  }

  if (result.length < topics.size) {
    const placed = new Set(result)
    result.push(...[...topics.keys()].filter((id) => !placed.has(id)).sort(byOrder))
  }
  return result
}
