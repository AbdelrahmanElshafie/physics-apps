'use client'

import { useState } from 'react'
import { Check, Layers } from 'lucide-react'

import { DisplayMath } from '@/components/math/Math'
import { cn } from '@/lib/utils'

/**
 * A worked example that fades out.
 *
 * Three stages of the same derivation: fully worked, then with the later steps blanked, then only
 * the starting point. This is the completion-problem effect — learners taken through faded worked
 * examples outperform both those given only worked examples and those thrown straight at problems.
 * Solving cold imposes so much search load that nothing is left over for noticing the structure;
 * a fully worked example imposes so little that nothing is demanded either.
 *
 * Each blanked step can be uncovered individually, so getting stuck on step 3 does not cost you
 * step 4. Nothing here is graded; the blanks are a way of reading, not a test.
 */

export interface FadedStep {
  /** The step, as LaTeX. */
  latex: string
  /** Why this step follows from the one before. Always visible — the reasoning is the lesson. */
  why?: string
}

/**
 * Chrome text, resolved by the MDX registry where the page's locale is known. Finished strings
 * rather than a translate function, so they cross the server/client boundary.
 */
export interface FadedStrings {
  label: string
  supportLevel: string
  reveal: string
  stages: { label: string; hint: string }[]
}

export function Faded({
  caption,
  steps,
  strings,
}: {
  caption?: string
  steps: FadedStep[]
  strings: FadedStrings
}) {
  const STAGES = strings.stages
  const [stage, setStage] = useState(0)
  const [uncovered, setUncovered] = useState<Set<number>>(new Set())

  // Worked: nothing hidden. Faded: the second half. Alone: everything after the first line.
  const firstHidden = stage === 0 ? steps.length : stage === 1 ? Math.ceil(steps.length / 2) : 1

  const setStageAndReset = (next: number) => {
    setStage(next)
    setUncovered(new Set())
  }

  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border bg-surface-sunken/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-raised px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          <Layers className="size-3.5" aria-hidden />
          {strings.label}
        </span>
        <div className="ms-auto flex gap-1" role="group" aria-label={strings.supportLevel}>
          {STAGES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setStageAndReset(i)}
              aria-pressed={stage === i}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition',
                stage === i
                  ? 'bg-accent text-canvas'
                  : 'text-fg-subtle hover:bg-surface hover:text-fg',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="border-b border-border/60 px-3.5 py-2 text-xs text-fg-subtle">
        {STAGES[stage]!.hint}
      </p>

      {/* list-none because the step number is rendered in its own column, so the marker would
          otherwise appear twice — once from the browser and once from us. */}
      <ol className="list-none divide-y divide-border/60">
        {steps.map((step, i) => {
          const hidden = i >= firstHidden && !uncovered.has(i)

          return (
            <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-x-2 px-3.5 py-3">
              <span className="pt-px font-mono text-xs text-fg-subtle">{i + 1}.</span>
              <div className="min-w-0">
                {step.why && (
                  <p className="mb-1.5 text-xs leading-relaxed text-fg-subtle">{step.why}</p>
                )}
                {hidden ? (
                  <button
                    type="button"
                    onClick={() => setUncovered((prev) => new Set(prev).add(i))}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface/50 py-3 text-xs text-fg-subtle transition hover:border-accent/60 hover:text-fg"
                  >
                    <Check className="size-3.5" aria-hidden />
                    {strings.reveal}
                  </button>
                ) : (
                  <div data-ltr>
                    <DisplayMath latex={step.latex} />
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {caption && (
        <figcaption className="border-t border-border bg-surface/60 px-3.5 py-2 text-xs text-fg-subtle">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
