'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, ChevronDown, Clock, Eye, HelpCircle, Lightbulb, XCircle } from 'lucide-react'

import type { Exercise } from '@core/domain'
import type { ExerciseProgress } from '@core/domain'
import { MathInput } from '@/components/math/MathInput'
import { revealSolution, submitAnswer } from '@/app/actions'
import { useThreadMessages } from '@/components/workspace/TutorStream'
import { useWorkspace } from '@/stores/workspace'
import { cn } from '@/lib/utils'

/**
 * One exercise: prompt, answer input, verdict, and a route to me when judgement is needed.
 *
 * The verdict vocabulary is deliberately three-valued. "Checked" and "not right" come from the
 * deterministic checker; "with your instructor" is what an unparseable or reasoning-based answer
 * gets. Collapsing that third state into "wrong" would be the single most damaging thing this
 * component could do — a correct answer the checker simply cannot read must never be marked wrong.
 */

type Verdict = 'correct' | 'incorrect' | 'unverified'

interface SubmissionState {
  verdict: Verdict
  detail?: string
  queuedForTutor: boolean
}

export function ExerciseCard({
  exercise,
  topicId,
  progress,
  promptHtml,
  givenHtml,
  solutionHtml,
  scaffoldHtml,
}: {
  exercise: Exercise
  topicId: string
  progress?: ExerciseProgress
  promptHtml: string
  givenHtml?: string
  solutionHtml: string
  scaffoldHtml?: string
}) {
  // The scaffold is shown as an "expected shape" hint below, never seeded into the field —
  // pre-filling a template means the first thing you do is navigate someone else's skeleton
  // instead of writing your answer.
  const [answer, setAnswer] = useState(progress?.lastAnswer ?? '')
  const [explanation, setExplanation] = useState(progress?.lastExplanation ?? '')
  const [result, setResult] = useState<SubmissionState | null>(null)
  const [showSolution, setShowSolution] = useState(progress?.solutionRevealed ?? false)
  const [showHint, setShowHint] = useState(false)
  const [pending, startTransition] = useTransition()
  const askAbout = useWorkspace((s) => s.askAbout)

  // This exercise's own tutor thread, taken from the page's single stream. Grading happens out
  // of band — I answer from the terminal — so without this the card would stay stale until a
  // manual refresh.
  const messages = useThreadMessages(`${topicId}#${exercise.id}`)
  const liveFeedback = [...messages].reverse().find((m) => m.role === 'tutor')?.body

  const explanationMissing = exercise.explain.required && explanation.trim().length === 0
  const canSubmit = answer.trim().length > 0 && !explanationMissing && !pending

  // Prefer the fresh submission, fall back to what the log says from a previous session.
  const settled: Verdict | 'partial' | null =
    result?.verdict ??
    progress?.tutorVerdict ??
    (progress?.autoVerdict === 'correct' ? 'correct' : null)

  const awaitingReview = result?.queuedForTutor ?? progress?.awaitingReview ?? false
  const canReveal =
    exercise.revealPolicy === 'on-request' ||
    (exercise.revealPolicy === 'after-attempt' && (progress?.attempts ?? 0) > 0) ||
    (exercise.revealPolicy === 'after-correct' && settled === 'correct')

  const submit = () => {
    if (!canSubmit) return
    startTransition(async () => {
      try {
        const outcome = await submitAnswer({
          topicId,
          exerciseId: exercise.id,
          answer,
          ...(explanation.trim().length > 0 ? { explanation: explanation.trim() } : {}),
        })
        setResult({
          verdict: outcome.autoVerdict,
          ...(outcome.detail !== undefined ? { detail: outcome.detail } : {}),
          queuedForTutor: outcome.queuedForTutor,
        })
      } catch (error) {
        setResult({
          verdict: 'unverified',
          detail: error instanceof Error ? error.message : 'Submission failed.',
          queuedForTutor: false,
        })
      }
    })
  }

  return (
    <article
      className={cn(
        'rounded-panel border bg-surface/50 transition-colors',
        settled === 'correct'
          ? 'border-success/40'
          : settled === 'incorrect'
            ? 'border-danger/40'
            : awaitingReview
              ? 'border-pending/40'
              : 'border-border',
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="shrink-0 font-mono text-xs font-semibold text-fg-subtle">
            {exercise.label ?? exercise.id}
          </span>
          <div
            className="min-w-0 text-sm leading-relaxed text-fg"
            dangerouslySetInnerHTML={{ __html: promptHtml }}
          />
        </div>
        <StatusBadge
          settled={settled}
          awaitingReview={awaitingReview && !liveFeedback}
          attempts={progress?.attempts ?? 0}
        />
      </header>

      <div className="space-y-3 px-4 py-3.5">
        {givenHtml && (
          <div
            className="pane-scroll overflow-x-auto rounded-lg border border-border bg-surface-sunken/60 px-3 py-2.5"
            dangerouslySetInnerHTML={{ __html: givenHtml }}
          />
        )}

        {scaffoldHtml && !answer && (
          <p className="text-xs text-fg-subtle">
            Expected shape:{' '}
            <span className="inline-block align-middle" dangerouslySetInnerHTML={{ __html: scaffoldHtml }} />
          </p>
        )}

        <MathInput
          value={answer}
          onChange={setAnswer}
          onSubmit={submit}
          ariaLabel={`Answer to ${exercise.label ?? exercise.id}`}
          placeholder="Your answer"
          disabled={pending}
        />

        {exercise.explain.required && (
          <div className="space-y-1.5">
            <label
              htmlFor={`explain-${exercise.id}`}
              className="flex items-center gap-1.5 text-xs font-medium text-fg-muted"
            >
              Your reasoning
              <span className="text-danger" aria-hidden>
                *
              </span>
              {exercise.explain.hint && (
                <span className="font-normal text-fg-subtle">— {exercise.explain.hint}</span>
              )}
            </label>
            <textarea
              id={`explain-${exercise.id}`}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
              placeholder="Why is that the answer?"
              className="w-full resize-y rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? 'Submitting...' : progress?.attempts ? 'Submit again' : 'Submit'}
          </button>

          {exercise.hint && (
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-muted transition-colors hover:border-warning hover:text-warning"
            >
              <Lightbulb className="size-3.5" aria-hidden />
              Hint
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              askAbout(
                { topicId, exerciseId: exercise.id, exerciseLabel: exercise.label ?? exercise.id },
                `About ${exercise.label ?? exercise.id}: `,
              )
            }
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent hover:text-accent"
          >
            <HelpCircle className="size-3.5" aria-hidden />
            Ask
          </button>

          {canReveal && !showSolution && (
            <button
              type="button"
              onClick={() => {
                setShowSolution(true)
                void revealSolution(topicId, exercise.id)
              }}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted"
            >
              <Eye className="size-3.5" aria-hidden />
              Show solution
            </button>
          )}
        </div>

        {showHint && exercise.hint && (
          <p className="rounded-lg border border-warning/40 bg-warning-muted/25 px-3 py-2 text-xs leading-relaxed text-fg-muted">
            {exercise.hint}
          </p>
        )}

        {(result || progress?.feedback || liveFeedback) && (
          <Feedback
            verdict={settled}
            detail={result?.detail}
            // A reply that has just arrived supersedes the queued state it resolves.
            queued={awaitingReview && !liveFeedback}
            tutorFeedback={liveFeedback ?? progress?.feedback}
          />
        )}

        {showSolution && (
          <details open className="group rounded-lg border border-border bg-surface-sunken/60">
            <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-0 -rotate-90" aria-hidden />
              Solution
            </summary>
            <div
              className="border-t border-border px-3 py-2.5 text-sm leading-relaxed text-fg-muted"
              dangerouslySetInnerHTML={{ __html: solutionHtml }}
            />
          </details>
        )}
      </div>
    </article>
  )
}

function StatusBadge({
  settled,
  awaitingReview,
  attempts,
}: {
  settled: Verdict | 'partial' | null
  awaitingReview: boolean
  attempts: number
}) {
  if (settled === 'correct') {
    return (
      <Badge className="border-success/40 bg-success-muted/40 text-success">
        <CheckCircle2 className="size-3.5" aria-hidden />
        Correct
      </Badge>
    )
  }
  if (settled === 'partial') {
    return (
      <Badge className="border-warning/40 bg-warning-muted/40 text-warning">
        <CheckCircle2 className="size-3.5" aria-hidden />
        Partly right
      </Badge>
    )
  }
  if (awaitingReview) {
    return (
      <Badge className="border-pending/40 bg-pending-muted/40 text-pending">
        <Clock className="size-3.5" aria-hidden />
        With instructor
      </Badge>
    )
  }
  if (settled === 'incorrect') {
    return (
      <Badge className="border-danger/40 bg-danger-muted/40 text-danger">
        <XCircle className="size-3.5" aria-hidden />
        Not right yet
      </Badge>
    )
  }
  if (attempts > 0) {
    return <Badge className="border-border bg-surface-raised text-fg-subtle">{attempts} attempts</Badge>
  }
  return null
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        className,
      )}
    >
      {children}
    </span>
  )
}

function Feedback({
  verdict,
  detail,
  queued,
  tutorFeedback,
}: {
  verdict: Verdict | 'partial' | null
  detail?: string
  queued: boolean
  tutorFeedback?: string
}) {
  if (tutorFeedback) {
    return (
      <div className="rounded-lg border border-accent/40 bg-accent-muted/25 px-3 py-2.5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
          Instructor feedback
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">{tutorFeedback}</p>
      </div>
    )
  }

  if (queued) {
    return (
      <p className="rounded-lg border border-pending/40 bg-pending-muted/25 px-3 py-2 text-xs leading-relaxed text-fg-muted">
        Sent to your instructor for review. The reply will appear here and in the tutor panel — no
        need to refresh.
      </p>
    )
  }

  if (verdict === 'correct') {
    return (
      <p className="rounded-lg border border-success/40 bg-success-muted/25 px-3 py-2 text-xs text-fg-muted">
        Checked and correct.
      </p>
    )
  }

  if (detail) {
    return (
      <p className="rounded-lg border border-danger/40 bg-danger-muted/25 px-3 py-2 text-xs text-fg-muted">
        {detail}
      </p>
    )
  }

  return null
}
