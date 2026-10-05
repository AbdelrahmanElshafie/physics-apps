import { describe, expect, it } from 'vitest'

import { mostRecentTopic, pendingReviews, reduceEvents, topicMastery, type LearningEvent } from '../src/domain'

/**
 * The append-only-log-to-state reducer, tested in isolation from any app's syllabus or services.
 * Replaying the same events must always produce the same picture — that guarantee is what makes
 * the log trustworthy as the single source of truth for both apps.
 */

const ts = (n: number) => new Date(2026, 0, 1, 0, 0, n).toISOString()

function events(...partial: Partial<LearningEvent>[]): LearningEvent[] {
  return partial.map((e, i) => ({ v: 1, id: `e${i}`, ts: ts(i), ...e }) as LearningEvent)
}

describe('reduceEvents', () => {
  it('marks a topic viewed', () => {
    const state = reduceEvents(events({ type: 'topic.viewed', topicId: 't1' }))
    expect(state.topics.get('t1' as never)?.viewed).toBe(true)
  })

  it('a new submission supersedes an earlier grade', () => {
    const state = reduceEvents(
      events(
        {
          type: 'attempt.submitted',
          topicId: 't1',
          exerciseId: 'e1',
          attemptId: 'a1',
          answer: '4',
          autoVerdict: 'incorrect',
        },
        {
          type: 'attempt.graded',
          topicId: 't1',
          exerciseId: 'e1',
          attemptId: 'a1',
          verdict: 'correct',
          feedback: 'Actually right, well done.',
          gradedBy: 'tutor',
        },
        {
          type: 'attempt.submitted',
          topicId: 't1',
          exerciseId: 'e1',
          attemptId: 'a2',
          answer: '5',
          autoVerdict: 'incorrect',
        },
      ),
    )
    const ex = state.topics.get('t1' as never)?.exercises.get('e1')
    expect(ex?.tutorVerdict).toBeUndefined()
    expect(ex?.awaitingReview).toBe(true)
    expect(ex?.attempts).toBe(2)
  })
})

describe('topicMastery', () => {
  it('is 1 once the checkpoint is passed, regardless of exercise state', () => {
    const state = reduceEvents(events({ type: 'checkpoint.passed', topicId: 't1' }))
    expect(topicMastery(state.topics.get('t1' as never), 10)).toBe(1)
  })

  it('gives partial credit at half weight', () => {
    const state = reduceEvents(
      events(
        {
          type: 'attempt.graded',
          topicId: 't1',
          exerciseId: 'e1',
          attemptId: 'a1',
          verdict: 'correct',
          feedback: '',
          gradedBy: 'auto',
        },
        {
          type: 'attempt.graded',
          topicId: 't1',
          exerciseId: 'e2',
          attemptId: 'a2',
          verdict: 'partial',
          feedback: '',
          gradedBy: 'tutor',
        },
      ),
    )
    expect(topicMastery(state.topics.get('t1' as never), 2)).toBeCloseTo(0.75, 5)
  })
})

describe('pendingReviews', () => {
  it('lists only what is awaiting review', () => {
    const state = reduceEvents(
      events(
        {
          type: 'attempt.submitted',
          topicId: 't1',
          exerciseId: 'e1',
          attemptId: 'a1',
          answer: 'x',
          autoVerdict: 'unverified',
        },
        {
          type: 'attempt.submitted',
          topicId: 't1',
          exerciseId: 'e2',
          attemptId: 'a2',
          answer: '3',
          autoVerdict: 'correct',
        },
      ),
    )
    const pending = pendingReviews(state)
    expect(pending).toHaveLength(1)
    expect(pending[0]!.exerciseId).toBe('e1')
  })
})

describe('mostRecentTopic', () => {
  it('is undefined when nothing has been touched', () => {
    expect(mostRecentTopic(reduceEvents([]))).toBeUndefined()
  })

  it('picks the topic touched last, not the topic visited first', () => {
    const state = reduceEvents(
      events(
        { type: 'topic.viewed', topicId: 't1' },
        { type: 'topic.viewed', topicId: 't2' },
        { type: 'topic.viewed', topicId: 't3' },
      ),
    )
    expect(mostRecentTopic(state)).toBe('t3')
  })

  it('counts any later activity on an earlier topic, not just a view', () => {
    const state = reduceEvents(
      events(
        { type: 'topic.viewed', topicId: 't1' },
        { type: 'topic.viewed', topicId: 't2' },
        {
          type: 'attempt.submitted',
          topicId: 't1',
          exerciseId: 'e1',
          attemptId: 'a1',
          answer: 'x',
          autoVerdict: 'unverified',
        },
      ),
    )
    // t2 was viewed after t1, but t1 had an attempt submitted after that — t1 is "more recent".
    expect(mostRecentTopic(state)).toBe('t1')
  })
})
