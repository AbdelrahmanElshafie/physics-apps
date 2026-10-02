import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

import { freshCardState, isDue, isLapsed, isNew, type ReviewCard } from '@physics/review'
import { container } from '@/container'
import { ReviewSession } from '@/components/review/ReviewSession'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Review session · Spanish, from scratch' }

/** A session is capped so "due" doesn't balloon into hundreds of cards on a catch-up day. */
const MAX_SESSION_SIZE = 40

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

export default async function ReviewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode: rawMode } = await searchParams
  const mode = rawMode === 'mistakes' ? 'mistakes' : 'due'

  const { reviewContent, review } = container
  const [cards, reviewState] = await Promise.all([reviewContent.allDecks(), review.state()])

  const now = new Date()
  const stateFor = (card: ReviewCard) => reviewState.cards.get(card.id) ?? freshCardState(card.id)

  const queue =
    mode === 'mistakes'
      ? shuffled(cards.filter((c) => isLapsed(stateFor(c))))
      : [
          ...shuffled(cards.filter((c) => !isNew(stateFor(c)) && isDue(stateFor(c), now))),
          ...shuffled(cards.filter((c) => isNew(stateFor(c)))),
        ].slice(0, MAX_SESSION_SIZE)

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Link
        href="/review"
        className="flex items-center gap-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to review
      </Link>

      <ReviewSession initialCards={queue} mode={mode} />
    </main>
  )
}
