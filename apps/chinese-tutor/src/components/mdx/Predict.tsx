'use client'

import { useState, type ReactNode } from 'react'
import { Eye, HelpCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Commit to an answer before the reveal.
 *
 * Reading an explanation feels like learning and mostly is not — the text agrees with whatever you
 * already believed, so a wrong guess survives intact. Being *wrong out loud first* is what makes
 * the correction land. So the reveal is gated: no scoring, nothing written to the event log — a
 * thinking device inside a lesson, not an assessment. Exercises are where answers are recorded.
 */
export function Predict({
  question,
  options,
  answer,
  children,
}: {
  question: string
  options: string[]
  /** Zero-based index of the correct option. */
  answer: number
  /** The explanation, revealed only after a choice. */
  children: ReactNode
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const revealed = picked !== null
  const correct = picked === answer

  return (
    <aside className="my-6 overflow-hidden rounded-panel border border-accent/40 bg-accent-muted/10">
      <div className="px-4 py-3.5">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-fg">
          <HelpCircle className="size-3.5 text-accent" aria-hidden />
          Guess first
        </p>
        <p className="hanzi-display mb-3 text-base leading-relaxed text-fg">{question}</p>

        <div role="group" aria-label={question} className="space-y-1.5">
          {options.map((option, i) => {
            const isAnswer = i === answer
            const isPicked = i === picked
            return (
              <button
                key={i}
                type="button"
                onClick={() => setPicked(i)}
                disabled={revealed}
                aria-pressed={isPicked}
                className={cn(
                  'hanzi-display flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition',
                  !revealed && 'border-border bg-surface/70 hover:border-accent/60 hover:bg-surface',
                  revealed && isAnswer && 'border-success/60 bg-success-muted/30 text-fg',
                  revealed && isPicked && !isAnswer && 'border-danger/60 bg-danger-muted/30 text-fg',
                  revealed && !isAnswer && !isPicked && 'border-border bg-surface/40 text-fg-subtle opacity-70',
                )}
              >
                <span
                  className={cn(
                    'mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.7rem] font-semibold',
                    revealed && isAnswer
                      ? 'border-success bg-success text-canvas'
                      : revealed && isPicked
                        ? 'border-danger bg-danger text-canvas'
                        : 'border-border-strong text-fg-subtle',
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="leading-relaxed">{option}</span>
              </button>
            )
          })}
        </div>
      </div>

      {revealed && (
        <div className="border-t border-accent/30 bg-surface/50 px-4 py-3.5">
          <p
            className={cn(
              'mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide',
              correct ? 'text-success' : 'text-warning',
            )}
          >
            <Eye className="size-3.5" aria-hidden />
            {correct ? 'Correct — the reason why' : 'Not this time — the reason why'}
          </p>
          <div className="text-sm leading-relaxed text-fg-muted [&>*+*]:mt-2">{children}</div>
        </div>
      )}
    </aside>
  )
}
