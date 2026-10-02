import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

import type { CardKind, ReviewCard } from '@physics/review'
import { container } from '@/container'
import { QuizSession, type QuizQuestion } from '@/components/review/QuizSession'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Big quiz · Spanish, from scratch' }

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

/**
 * Every card becomes one auto-generated multichoice question — computer-graded, so the whole deck
 * can be covered in one sitting with no tutor round-trip. Distractors are sampled from other cards
 * of the same kind, falling back to the whole deck when a kind doesn't have three others to draw
 * from.
 */
function buildQuizQuestions(cards: ReviewCard[]): QuizQuestion[] {
  return shuffled(cards).map((card) => {
    const frontToBack = Math.random() < 0.5
    const sameKind = cards.filter((c) => c.kind === card.kind && c.id !== card.id)
    const pool = sameKind.length >= 3 ? sameKind : cards.filter((c) => c.id !== card.id)

    if (frontToBack) {
      const candidates = shuffled(pool.filter((c) => c.back !== card.back)).slice(0, 3)
      const choices = shuffled([card.back, ...candidates.map((c) => c.back)])
      return {
        cardId: card.id,
        kind: card.kind as CardKind,
        prompt: card.front,
        ...(card.frontPronunciation ? { promptPronunciation: card.frontPronunciation } : {}),
        audioText: card.audioText ?? card.front,
        choices,
        correctIndex: choices.indexOf(card.back),
      }
    }

    const candidates = shuffled(pool.filter((c) => c.front !== card.front)).slice(0, 3)
    const choices = shuffled([card.front, ...candidates.map((c) => c.front)])
    return {
      cardId: card.id,
      kind: card.kind as CardKind,
      prompt: card.back,
      choices,
      correctIndex: choices.indexOf(card.front),
    }
  })
}

export default async function ReviewQuizPage() {
  const cards = await container.reviewContent.allDecks()
  const questions = buildQuizQuestions(cards)

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Link
        href="/review"
        className="flex items-center gap-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to review
      </Link>

      {questions.length < 4 ? (
        <div className="mt-10 rounded-panel border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm font-medium text-fg">Not enough cards yet for a full quiz.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
            A multichoice question needs at least four cards to draw wrong answers from — work
            through a few more lessons first.
          </p>
        </div>
      ) : (
        <QuizSession questions={questions} />
      )}
    </main>
  )
}
