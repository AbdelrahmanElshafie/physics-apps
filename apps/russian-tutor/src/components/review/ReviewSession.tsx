'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, PartyPopper } from 'lucide-react'

import type { Grade, ReviewCard } from '@physics/review'
import { SpeakButton } from '@/components/audio/SpeakButton'
import { gradeCard } from '@/app/review/actions'
import { cn } from '@/lib/utils'

/** How far back into the queue a missed card is reinserted — far enough that it isn't an
 * immediate repeat (which teaches nothing), soon enough it's seen again this same session. */
const REQUEUE_OFFSET = 3

const GRADE_BUTTONS: { grade: Grade; label: string; className: string }[] = [
  { grade: 'again', label: 'Again', className: 'bg-danger text-canvas hover:opacity-90' },
  { grade: 'hard', label: 'Hard', className: 'bg-warning text-canvas hover:opacity-90' },
  { grade: 'good', label: 'Good', className: 'bg-accent text-canvas hover:opacity-90' },
  { grade: 'easy', label: 'Easy', className: 'bg-success text-canvas hover:opacity-90' },
]

export function ReviewSession({
  initialCards,
  mode,
}: {
  initialCards: ReviewCard[]
  mode: 'due' | 'mistakes'
}) {
  const [queue, setQueue] = useState(initialCards)
  const [revealed, setRevealed] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [pending, startTransition] = useTransition()

  const total = initialCards.length
  const current = queue[0]

  const grade = (g: Grade) => {
    if (!current) return
    startTransition(async () => {
      await gradeCard({ cardId: current.id, grade: g })
    })
    setReviewedCount((n) => n + 1)
    setRevealed(false)
    setQueue((q) => {
      const [first, ...rest] = q
      if (!first) return q
      if (g === 'again') {
        const offset = Math.min(rest.length, REQUEUE_OFFSET)
        return [...rest.slice(0, offset), first, ...rest.slice(offset)]
      }
      return rest
    })
  }

  if (total === 0) {
    return (
      <div className="mt-10 rounded-panel border border-dashed border-border px-6 py-12 text-center">
        <PartyPopper className="mx-auto size-6 text-fg-subtle" aria-hidden />
        <p className="mt-3 text-sm font-medium text-fg">
          {mode === 'mistakes' ? 'Nothing to practice right now.' : 'Nothing due right now.'}
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
          {mode === 'mistakes'
            ? "You're not currently struggling with anything that's been reviewed before."
            : 'Come back once new cards or due reviews build up, or try the big quiz instead.'}
        </p>
        <Link
          href="/review"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          Back to review
        </Link>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="mt-10 rounded-panel border border-success/40 bg-success-muted/10 px-6 py-12 text-center">
        <CheckCircle2 className="mx-auto size-6 text-success" aria-hidden />
        <p className="mt-3 text-sm font-medium text-fg">Session complete.</p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
          {reviewedCount} grade{reviewedCount === 1 ? '' : 's'} recorded.
        </p>
        <Link
          href="/review"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          Back to review
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {queue.length} card{queue.length === 1 ? '' : 's'} left this session
      </p>

      <div className="mt-3 rounded-panel border border-border bg-surface px-6 py-10 text-center">
        <p className="word-display text-3xl font-medium text-fg">{current.front}</p>
        <div className="mt-2 flex justify-center">
          <SpeakButton text={current.audioText ?? current.front} />
        </div>

        {revealed ? (
          <div className="mt-6 border-t border-border pt-5">
            {current.frontPronunciation && (
              <p className="word-display text-sm text-fg-subtle">{current.frontPronunciation}</p>
            )}
            <p className="mt-1.5 text-lg font-medium text-fg">{current.back}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-6 rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent-strong"
          >
            Show answer
          </button>
        )}
      </div>

      {revealed && (
        <fieldset disabled={pending} className="mt-4 grid grid-cols-4 gap-2">
          {GRADE_BUTTONS.map(({ grade: g, label, className }) => (
            <button
              key={g}
              type="button"
              onClick={() => grade(g)}
              className={cn('rounded-lg py-2.5 text-sm font-medium transition-opacity', className)}
            >
              {label}
            </button>
          ))}
        </fieldset>
      )}
    </div>
  )
}
