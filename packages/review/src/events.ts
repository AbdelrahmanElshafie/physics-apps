import { z } from 'zod'

import { freshCardState, scheduleNext, GRADES, type CardState, type Grade } from './scheduler'

/**
 * The review log — same append-only shape as `learningEventSchema` in `@physics/core`, and for the
 * same reason: a card's current schedule is a replay, never a stored-and-mutated record, so
 * re-deriving it after changing the scheduler's formula needs no migration.
 */
const base = {
  v: z.literal(1),
  id: z.string().min(1),
  ts: z.string().datetime(),
}

export const reviewEventSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('card.graded'),
    cardId: z.string().min(1),
    grade: z.enum(GRADES),
  }),
])
export type ReviewEvent = z.infer<typeof reviewEventSchema>

/** Parses one JSONL line. Returns null for blank lines so a trailing newline is harmless. */
export function parseReviewEventLine(line: string): ReviewEvent | null {
  const trimmed = line.trim()
  if (trimmed.length === 0) return null
  return reviewEventSchema.parse(JSON.parse(trimmed))
}

export interface ReviewState {
  readonly cards: ReadonlyMap<string, CardState>
  readonly eventCount: number
}

export const EMPTY_REVIEW_STATE: ReviewState = { cards: new Map(), eventCount: 0 }

/**
 * Folds the log into one `CardState` per card. Events are replayed in the order given — callers
 * are responsible for reading the log in append order (the filesystem adapter does this).
 */
export function reduceReviewEvents(events: readonly ReviewEvent[]): ReviewState {
  const cards = new Map<string, CardState>()

  for (const event of events) {
    const prev = cards.get(event.cardId) ?? freshCardState(event.cardId)
    const ts = new Date(event.ts)
    cards.set(event.cardId, scheduleNext(prev, event.grade as Grade, ts))
  }

  return { cards, eventCount: events.length }
}
