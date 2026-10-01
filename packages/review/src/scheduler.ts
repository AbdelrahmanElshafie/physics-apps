/**
 * Spaced-repetition scheduling — the SM-2 algorithm, in Anki's well-known 4-button adaptation
 * (Again / Hard / Good / Easy) rather than SM-2's original 0–5 quality scale, because a learner
 * self-grading "how hard was that to recall" in four buckets is a far easier real-world UI than
 * picking a number.
 *
 * Pure and stateless by design, same reason `checkWorking` in `@physics/scratchpad` is pure: it
 * only transforms a `CardState`, never touches storage. The event log in `events.ts` is what
 * makes a card's current state derivable rather than stored-and-mutated.
 */

export const GRADES = ['again', 'hard', 'good', 'easy'] as const
export type Grade = (typeof GRADES)[number]

export interface CardState {
  readonly cardId: string
  readonly repetitions: number
  readonly easeFactor: number
  readonly intervalDays: number
  /** ISO timestamp. The card is due for review once `now >= dueAt`. */
  readonly dueAt: string
  readonly lapses: number
  readonly lastGrade?: Grade
  readonly lastReviewedAt?: string
}

const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3

function addDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * A brand-new card, never yet reviewed. Exists so callers never special-case "no prior state" —
 * every card has a `CardState` from the moment it's first shown.
 */
export function freshCardState(cardId: string): CardState {
  return {
    cardId,
    repetitions: 0,
    easeFactor: DEFAULT_EASE,
    intervalDays: 0,
    dueAt: new Date(0).toISOString(), // Already due — a card you've never reviewed is always due.
    lapses: 0,
  }
}

/**
 * One grading step. `again` resets progress on the card (it was forgotten — treated as a lapse,
 * not a fresh start, so `lapses` keeps counting); `hard`/`good`/`easy` grow the interval by a
 * shrinking or widening multiple of the ease factor, same shape as real SM-2.
 */
export function scheduleNext(prev: CardState, grade: Grade, now: Date): CardState {
  const { repetitions, easeFactor, intervalDays } = prev

  if (grade === 'again') {
    return {
      cardId: prev.cardId,
      repetitions: 0,
      easeFactor: Math.max(MIN_EASE, easeFactor - 0.2),
      intervalDays: 1,
      dueAt: addDays(now, 1),
      lapses: prev.lapses + 1,
      lastGrade: grade,
      lastReviewedAt: now.toISOString(),
    }
  }

  const nextRepetitions = repetitions + 1
  const priorInterval = Math.max(intervalDays, 1)

  let nextEase = easeFactor
  let nextInterval: number

  if (grade === 'hard') {
    nextEase = Math.max(MIN_EASE, easeFactor - 0.15)
    nextInterval = Math.max(1, Math.round(priorInterval * 1.2))
  } else if (grade === 'good') {
    nextInterval =
      nextRepetitions === 1 ? 1 : nextRepetitions === 2 ? 6 : Math.round(priorInterval * easeFactor)
  } else {
    // easy
    nextEase = easeFactor + 0.15
    nextInterval =
      nextRepetitions === 1
        ? 2
        : nextRepetitions === 2
          ? 8
          : Math.round(priorInterval * easeFactor * 1.3)
  }

  return {
    cardId: prev.cardId,
    repetitions: nextRepetitions,
    easeFactor: nextEase,
    intervalDays: nextInterval,
    dueAt: addDays(now, nextInterval),
    lapses: prev.lapses,
    lastGrade: grade,
    lastReviewedAt: now.toISOString(),
  }
}

export function isDue(state: CardState, now: Date): boolean {
  return new Date(state.dueAt).getTime() <= now.getTime()
}

/** A card is "new" (never graded) until its first `scheduleNext` call. */
export function isNew(state: CardState): boolean {
  return state.lastReviewedAt === undefined
}

/** Recently forgotten or still struggling — the signal that feeds the mistakes bucket. */
export function isLapsed(state: CardState): boolean {
  return state.lapses > 0 && state.repetitions === 0
}
