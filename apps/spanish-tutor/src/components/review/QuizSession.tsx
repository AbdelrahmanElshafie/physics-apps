'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'

import type { CardKind } from '@physics/review'
import { SpeakButton } from '@/components/audio/SpeakButton'
import { gradeCard } from '@/app/review/actions'
import { cn } from '@/lib/utils'

export interface QuizQuestion {
  cardId: string
  kind: CardKind
  prompt: string
  promptPronunciation?: string
  audioText?: string
  choices: string[]
  correctIndex: number
}

export function QuizSession({ questions: initialQuestions }: { questions: QuizQuestion[] }) {
  // Seeded once and never re-read from props: grading a question calls a server action, and
  // Next.js refreshes this route's server component after any action resolves — regenerating a
  // brand-new random shuffle. Reading `questions` as a live prop would swap the quiz out from
  // under whichever question the student had just answered.
  const [questions] = useState(initialQuestions)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [, startTransition] = useTransition()

  const current = questions[index]

  const pick = (choiceIndex: number) => {
    if (!current || picked !== null) return
    setPicked(choiceIndex)
    const isCorrect = choiceIndex === current.correctIndex
    if (isCorrect) setCorrectCount((n) => n + 1)
    startTransition(async () => {
      await gradeCard({ cardId: current.cardId, grade: isCorrect ? 'good' : 'again' })
    })
  }

  const next = () => {
    setPicked(null)
    setIndex((i) => i + 1)
  }

  if (!current) {
    const pct = Math.round((correctCount / questions.length) * 100)
    return (
      <div className="mt-10 rounded-panel border border-border bg-surface px-6 py-12 text-center">
        <p className="text-3xl font-semibold text-fg">
          {correctCount} / {questions.length}
        </p>
        <p className="mt-1.5 text-sm text-fg-muted">{pct}% correct</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-fg-subtle">
          Missed cards were graded &quot;again&quot; and will come back sooner in review — correct
          ones were graded &quot;good&quot;.
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
        Question {index + 1} of {questions.length}
      </p>

      <div className="mt-3 rounded-panel border border-border bg-surface px-6 py-8 text-center">
        <p className="word-display text-2xl font-medium text-fg">{current.prompt}</p>
        {current.promptPronunciation && (
          <p className="word-display mt-1 text-sm text-fg-subtle">{current.promptPronunciation}</p>
        )}
        {current.audioText && (
          <div className="mt-2 flex justify-center">
            <SpeakButton text={current.audioText} />
          </div>
        )}
      </div>

      <fieldset disabled={picked !== null} className="mt-4 space-y-1.5">
        <legend className="sr-only">Choose the matching answer</legend>
        {current.choices.map((choice, choiceIndex) => {
          const isCorrectChoice = choiceIndex === current.correctIndex
          const isPicked = choiceIndex === picked
          return (
            <button
              key={choice}
              type="button"
              onClick={() => pick(choiceIndex)}
              className={cn(
                'flex w-full items-center justify-between gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors',
                picked === null && 'border-border bg-surface-sunken hover:border-accent',
                picked !== null && isCorrectChoice && 'border-success/50 bg-success-muted/20 text-fg',
                picked !== null &&
                  isPicked &&
                  !isCorrectChoice &&
                  'border-danger/50 bg-danger-muted/20 text-fg',
                picked !== null &&
                  !isPicked &&
                  !isCorrectChoice &&
                  'border-border bg-surface-sunken text-fg-subtle',
              )}
            >
              <span className="word-display">{choice}</span>
              {picked !== null && isCorrectChoice && (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              )}
              {picked !== null && isPicked && !isCorrectChoice && (
                <XCircle className="size-4 shrink-0 text-danger" aria-hidden />
              )}
            </button>
          )
        })}
      </fieldset>

      {picked !== null && (
        <button
          type="button"
          onClick={next}
          className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          {index + 1 === questions.length ? 'See score' : 'Next question'}
        </button>
      )}
    </div>
  )
}
