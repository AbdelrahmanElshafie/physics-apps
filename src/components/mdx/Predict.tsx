'use client'

import { useState, type ReactNode } from 'react'
import { Eye, HelpCircle } from 'lucide-react'

import { M } from '@/components/math/Math'
import { cn } from '@/lib/utils'

/**
 * Commit to an answer before the reveal.
 *
 * Reading an explanation feels like learning and mostly is not — the text agrees with whatever you
 * already believed, so a wrong belief survives intact. Being *wrong out loud first* is what makes
 * the correction land. The pretesting effect is one of the larger ones in the literature, and it
 * works even when the guess is wrong; especially then.
 *
 * So the reveal is gated. You cannot read the answer until you have picked one. There is no
 * scoring and nothing is written to the event log: this is a thinking device inside a lesson, not
 * an assessment. Exercises are where answers are recorded.
 */
export interface PredictStrings {
  label: string
  right: string
  wrong: string
}

export function Predict({
  question,
  options,
  answer,
  strings,
  children,
}: {
  question: string
  /** Each option is a short string; `$...$` inside it is typeset. */
  options: string[]
  /** Zero-based index of the correct option. */
  answer: number
  /**
   * Chrome text, resolved by the MDX registry, which is where the page's locale is known. Passing
   * finished strings rather than a translate function keeps this serialisable across the
   * server/client boundary.
   */
  strings: PredictStrings
  /** The explanation, revealed only after a choice. */
  children: ReactNode
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const revealed = picked !== null
  const correct = picked === answer

  return (
    <aside className="my-6 overflow-hidden rounded-panel border border-pending/40 bg-pending-muted/20">
      <div className="px-4 py-3.5">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg">
          <HelpCircle className="size-3.5 text-pending" aria-hidden />
          {strings.label}
        </p>
        <p className="mb-3 text-sm leading-relaxed text-fg">
          <Inline text={question} />
        </p>

        {/* The question already carries `$...$` markers; strip them so a screen reader does not
            read the dollar signs aloud. */}
        <div role="group" aria-label={question.replaceAll('$', '')} className="space-y-1.5">
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
                  'flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition',
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
                <span className="leading-relaxed">
                  <Inline text={option} />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {revealed && (
        <div className="border-t border-pending/30 bg-surface/50 px-4 py-3.5">
          <p
            className={cn(
              'mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide',
              correct ? 'text-success' : 'text-warning',
            )}
          >
            <Eye className="size-3.5" aria-hidden />
            {correct ? strings.right : strings.wrong}
          </p>
          <div className="text-sm leading-relaxed text-fg-muted [&>*+*]:mt-2">{children}</div>
        </div>
      )}
    </aside>
  )
}

/** Splits on `$...$` so an option can carry notation. Mirrors `Compare`'s cell rendering. */
function Inline({ text }: { text: string }) {
  if (!text.includes('$')) return <>{text}</>
  const parts = text.split(/(\$[^$]+\$)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('$') && part.endsWith('$') && part.length > 2 ? (
          <M key={i}>{part.slice(1, -1)}</M>
        ) : (
          part
        ),
      )}
    </>
  )
}
