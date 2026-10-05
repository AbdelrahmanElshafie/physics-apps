import { describe, expect, it } from 'vitest'

import {
  buildSyllabus,
  mostRecentTopic,
  pendingReviews,
  reduceEvents,
  syllabusFileSchema,
  topicMastery,
  type LearningEvent,
} from '@core/domain'
import { buildTopicViews, nextTopic, summarise } from '@core/services'

/**
 * Progress is derived state — `reduce(events)` — so these tests are the guarantee that replaying
 * a log always produces the same picture. They also pin the rule that a new submission supersedes
 * an earlier grade, which is easy to regress and invisible until a stale "correct" sticks around.
 */

let counter = 0
const at = (n: number) => new Date(Date.UTC(2026, 1, 17, 10, n)).toISOString()

/** `Omit` over a union collapses to the common keys; this preserves each member. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

const event = (e: DistributiveOmit<LearningEvent, 'v' | 'id' | 'ts'> & { ts?: string }): LearningEvent =>
  ({ v: 1, id: `e${(counter += 1)}`, ts: e.ts ?? at(counter), ...e }) as LearningEvent

describe('reduceEvents', () => {
  it('returns empty state for an empty log', () => {
    const state = reduceEvents([])
    expect(state.topics.size).toBe(0)
    expect(state.eventCount).toBe(0)
  })

  it('marks a topic viewed and keeps the first view time', () => {
    const state = reduceEvents([
      event({ type: 'topic.viewed', topicId: 't1', ts: at(1) }),
      event({ type: 'topic.viewed', topicId: 't1', ts: at(5) }),
    ])
    expect(state.topics.get('t1' as never)?.viewed).toBe(true)
    expect(state.topics.get('t1' as never)?.firstViewedAt).toBe(at(1))
  })

  it('counts attempts and keeps the latest answer', () => {
    const state = reduceEvents([
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q4',
        attemptId: 'a1',
        answer: '(6,3)',
        autoVerdict: 'incorrect',
      }),
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q4',
        attemptId: 'a2',
        answer: '(6,2)',
        autoVerdict: 'correct',
      }),
    ])
    const exercise = state.topics.get('t1' as never)?.exercises.get('q4')
    expect(exercise?.attempts).toBe(2)
    expect(exercise?.lastAnswer).toBe('(6,2)')
    expect(exercise?.autoVerdict).toBe('correct')
  })

  it('clears awaitingReview when an auto-check passes', () => {
    const state = reduceEvents([
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q4',
        attemptId: 'a1',
        answer: '(6,2)',
        autoVerdict: 'correct',
      }),
    ])
    expect(state.topics.get('t1' as never)?.exercises.get('q4')?.awaitingReview).toBe(false)
  })

  it('leaves an unverified answer awaiting review', () => {
    const state = reduceEvents([
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q9',
        attemptId: 'a1',
        answer: 'yes, closure',
        autoVerdict: 'unverified',
      }),
    ])
    expect(state.topics.get('t1' as never)?.exercises.get('q9')?.awaitingReview).toBe(true)
  })

  it('applies a tutor grade and stops awaiting review', () => {
    const state = reduceEvents([
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q9',
        attemptId: 'a1',
        answer: 'yes',
        autoVerdict: 'unverified',
      }),
      event({
        type: 'attempt.graded',
        topicId: 't1',
        exerciseId: 'q9',
        attemptId: 'a1',
        verdict: 'partial',
        feedback: 'Right answer, name the property.',
        gradedBy: 'tutor',
      }),
    ])
    const exercise = state.topics.get('t1' as never)?.exercises.get('q9')
    expect(exercise?.tutorVerdict).toBe('partial')
    expect(exercise?.awaitingReview).toBe(false)
    expect(exercise?.feedback).toMatch(/name the property/)
  })

  it('supersedes an old grade when the answer is resubmitted', () => {
    const state = reduceEvents([
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q9',
        attemptId: 'a1',
        answer: 'first',
        autoVerdict: 'unverified',
      }),
      event({
        type: 'attempt.graded',
        topicId: 't1',
        exerciseId: 'q9',
        attemptId: 'a1',
        verdict: 'incorrect',
        feedback: 'Not quite.',
        gradedBy: 'tutor',
      }),
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q9',
        attemptId: 'a2',
        answer: 'second',
        autoVerdict: 'unverified',
      }),
    ])
    const exercise = state.topics.get('t1' as never)?.exercises.get('q9')
    // A stale "incorrect" on a fresh answer would be actively misleading.
    expect(exercise?.tutorVerdict).toBeUndefined()
    expect(exercise?.awaitingReview).toBe(true)
  })

  it('is deterministic — replaying the same log gives the same state', () => {
    const log: LearningEvent[] = [
      event({ type: 'topic.viewed', topicId: 't1' }),
      event({ type: 'checkpoint.passed', topicId: 't1' }),
    ]
    expect(JSON.stringify([...reduceEvents(log).topics])).toBe(
      JSON.stringify([...reduceEvents(log).topics]),
    )
  })
})

describe('topicMastery', () => {
  it('is zero with no progress', () => {
    expect(topicMastery(undefined, 5)).toBe(0)
  })

  it('is one once the checkpoint is passed, regardless of exercises', () => {
    const state = reduceEvents([event({ type: 'checkpoint.passed', topicId: 't1' })])
    expect(topicMastery(state.topics.get('t1' as never), 20)).toBe(1)
  })

  it('counts a partial at half weight', () => {
    const state = reduceEvents([
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q1',
        attemptId: 'a1',
        answer: 'x',
        autoVerdict: 'unverified',
      }),
      event({
        type: 'attempt.graded',
        topicId: 't1',
        exerciseId: 'q1',
        attemptId: 'a1',
        verdict: 'partial',
        feedback: '',
        gradedBy: 'tutor',
      }),
    ])
    expect(topicMastery(state.topics.get('t1' as never), 2)).toBeCloseTo(0.25)
  })

  it('gives a small floor for reading the lesson', () => {
    const state = reduceEvents([event({ type: 'topic.viewed', topicId: 't1' })])
    expect(topicMastery(state.topics.get('t1' as never), 10)).toBeCloseTo(0.05)
  })

  it('never exceeds one', () => {
    const state = reduceEvents([
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q1',
        attemptId: 'a1',
        answer: 'x',
        autoVerdict: 'correct',
      }),
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q2',
        attemptId: 'a2',
        answer: 'y',
        autoVerdict: 'correct',
      }),
    ])
    expect(topicMastery(state.topics.get('t1' as never), 1)).toBe(1)
  })
})

describe('pendingReviews', () => {
  it('lists every exercise waiting on the tutor', () => {
    const state = reduceEvents([
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q9',
        attemptId: 'a1',
        answer: 'x',
        autoVerdict: 'unverified',
      }),
      event({
        type: 'attempt.submitted',
        topicId: 't2',
        exerciseId: 'q3',
        attemptId: 'a2',
        answer: 'y',
        autoVerdict: 'correct',
      }),
    ])
    expect(pendingReviews(state).map((p) => p.exerciseId)).toEqual(['q9'])
  })
})

describe('mostRecentTopic', () => {
  it('is undefined when nothing has been touched', () => {
    expect(mostRecentTopic(reduceEvents([]))).toBeUndefined()
  })

  it('picks the topic touched last, not the topic visited first', () => {
    const state = reduceEvents([
      event({ type: 'topic.viewed', topicId: 't1' }),
      event({ type: 'topic.viewed', topicId: 't2' }),
      event({ type: 'topic.viewed', topicId: 't3' }),
    ])
    expect(mostRecentTopic(state)).toBe('t3')
  })

  it('counts any later activity on an earlier topic, not just a view', () => {
    const state = reduceEvents([
      event({ type: 'topic.viewed', topicId: 't1' }),
      event({ type: 'topic.viewed', topicId: 't2' }),
      event({
        type: 'attempt.submitted',
        topicId: 't1',
        exerciseId: 'q1',
        attemptId: 'a1',
        answer: 'x',
        autoVerdict: 'unverified',
      }),
    ])
    // t2 was viewed after t1, but t1 had an attempt submitted after that — t1 is "more recent".
    expect(mostRecentTopic(state)).toBe('t1')
  })
})

describe('buildTopicViews', () => {
  const syllabus = buildSyllabus(
    syllabusFileSchema.parse({
      schemaVersion: 1,
      id: 'test',
      title: 'Test',
      phases: [
        {
          id: 'p1',
          title: 'P1',
          modules: [
            {
              id: 'm1',
              title: 'M1',
              topics: [
                { id: 'a', title: 'A' },
                { id: 'b', title: 'B', requires: ['a'] },
                { id: 'c', title: 'C', requires: ['b'] },
              ],
            },
          ],
        },
      ],
    }),
  )

  it('locks a topic whose prerequisite is unfinished', () => {
    const views = buildTopicViews(syllabus, reduceEvents([]), new Map())
    expect(views.get('test:a' as never)?.status).toBe('ready')
    expect(views.get('test:b' as never)?.status).toBe('locked')
  })

  it('explains what is blocking a locked topic', () => {
    const views = buildTopicViews(syllabus, reduceEvents([]), new Map())
    expect(views.get('test:b' as never)?.blockedBy.map((t) => t.title)).toEqual(['A'])
  })

  it('unlocks the next topic once the prerequisite checkpoint passes', () => {
    const state = reduceEvents([event({ type: 'checkpoint.passed', topicId: 'test:a' })])
    const views = buildTopicViews(syllabus, state, new Map())
    expect(views.get('test:a' as never)?.status).toBe('complete')
    expect(views.get('test:b' as never)?.status).toBe('ready')
    expect(views.get('test:c' as never)?.status).toBe('locked')
  })

  it('prioritises awaiting-review over locked', () => {
    const state = reduceEvents([
      event({
        type: 'attempt.submitted',
        topicId: 'test:b',
        exerciseId: 'q1',
        attemptId: 'a1',
        answer: 'x',
        autoVerdict: 'unverified',
      }),
    ])
    const views = buildTopicViews(syllabus, state, new Map([['test:b' as never, 1]]))
    expect(views.get('test:b' as never)?.status).toBe('awaiting-review')
  })
})

describe('nextTopic', () => {
  const syllabus = buildSyllabus(
    syllabusFileSchema.parse({
      schemaVersion: 1,
      id: 'test',
      title: 'Test',
      phases: [
        {
          id: 'p1',
          title: 'P1',
          modules: [
            {
              id: 'm1',
              title: 'M1',
              topics: [
                { id: 'a', title: 'A' },
                { id: 'b', title: 'B', requires: ['a'] },
              ],
            },
          ],
        },
      ],
    }),
  )

  it('picks the first ready topic on a fresh start', () => {
    const views = buildTopicViews(syllabus, reduceEvents([]), new Map())
    expect(nextTopic(views, syllabus.order)?.topic.localId).toBe('a')
  })

  it('prefers work already in progress', () => {
    const state = reduceEvents([
      event({ type: 'checkpoint.passed', topicId: 'test:a' }),
      event({ type: 'topic.viewed', topicId: 'test:b' }),
    ])
    const views = buildTopicViews(syllabus, state, new Map())
    expect(nextTopic(views, syllabus.order)?.topic.localId).toBe('b')
  })

  it('returns null when everything is complete', () => {
    const state = reduceEvents([
      event({ type: 'checkpoint.passed', topicId: 'test:a' }),
      event({ type: 'checkpoint.passed', topicId: 'test:b' }),
    ])
    const views = buildTopicViews(syllabus, state, new Map())
    expect(nextTopic(views, syllabus.order)).toBeNull()
  })

  it('summarises counts across the syllabus', () => {
    const state = reduceEvents([event({ type: 'checkpoint.passed', topicId: 'test:a' })])
    const stats = summarise(buildTopicViews(syllabus, state, new Map()))
    expect(stats.total).toBe(2)
    expect(stats.complete).toBe(1)
    expect(stats.overallMastery).toBeCloseTo(0.5)
  })
})
