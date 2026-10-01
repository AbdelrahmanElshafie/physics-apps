import { describe, expect, it } from 'vitest'
import { EMPTY_REVIEW_STATE, parseReviewEventLine, reduceReviewEvents, reviewEventSchema } from '../src/events'
import { isLapsed } from '../src/scheduler'

function graded(cardId: string, grade: 'again' | 'hard' | 'good' | 'easy', ts: string) {
  return reviewEventSchema.parse({ v: 1, id: `${cardId}-${ts}`, ts, type: 'card.graded', cardId, grade })
}

describe('reduceReviewEvents', () => {
  it('is empty with no events', () => {
    expect(reduceReviewEvents([])).toEqual(EMPTY_REVIEW_STATE)
  })

  it('folds repeated grades for the same card into one running CardState', () => {
    const events = [
      graded('card-1', 'good', '2026-01-01T00:00:00.000Z'),
      graded('card-1', 'good', '2026-01-02T00:00:00.000Z'),
    ]
    const state = reduceReviewEvents(events)
    expect(state.eventCount).toBe(2)
    const card = state.cards.get('card-1')
    expect(card?.repetitions).toBe(2)
    expect(card?.intervalDays).toBe(6)
  })

  it('tracks independent state per card', () => {
    const events = [
      graded('card-1', 'good', '2026-01-01T00:00:00.000Z'),
      graded('card-2', 'again', '2026-01-01T00:00:00.000Z'),
    ]
    const state = reduceReviewEvents(events)
    expect(state.cards.get('card-1')?.lapses).toBe(0)
    expect(isLapsed(state.cards.get('card-2')!)).toBe(true)
  })

  it('replays in event order, so a later "again" overrides an earlier "good"', () => {
    const events = [
      graded('card-1', 'good', '2026-01-01T00:00:00.000Z'),
      graded('card-1', 'good', '2026-01-02T00:00:00.000Z'),
      graded('card-1', 'again', '2026-01-03T00:00:00.000Z'),
    ]
    const state = reduceReviewEvents(events)
    const card = state.cards.get('card-1')!
    expect(card.repetitions).toBe(0)
    expect(card.lapses).toBe(1)
  })
})

describe('parseReviewEventLine', () => {
  it('parses a valid JSONL line', () => {
    const line = JSON.stringify({ v: 1, id: 'e1', ts: '2026-01-01T00:00:00.000Z', type: 'card.graded', cardId: 'c', grade: 'good' })
    expect(parseReviewEventLine(line)?.cardId).toBe('c')
  })

  it('returns null for a blank line', () => {
    expect(parseReviewEventLine('   ')).toBeNull()
  })

  it('throws on a malformed line', () => {
    expect(() => parseReviewEventLine('{not json')).toThrow()
  })
})
