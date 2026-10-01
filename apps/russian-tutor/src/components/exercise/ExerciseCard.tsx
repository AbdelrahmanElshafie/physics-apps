'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Eye, HelpCircle, Lightbulb, XCircle } from 'lucide-react'

import { containsCyrillic, type Exercise, type ExerciseProgress } from '@core/domain'
import { submitExercise, revealSolution } from '@/app/actions'
import { SpeakButton } from '@/components/audio/SpeakButton'
import { ExerciseTutor } from './ExerciseTutor'
import { cn } from '@/lib/utils'

type Verdict = 'correct' | 'incorrect' | 'unverified'

interface SubmissionState {
  verdict: Verdict
  detail?: string
  awaitingReview: boolean
}

/**
 * One exercise: prompt, answer input, verdict.
 *
 * The verdict vocabulary is three-valued on purpose. "Checked" and "not right" come from the
 * rule-based checker; "waiting" is what an answer the checker has no opinion on gets — never
 * "wrong". A checker that cannot judge a translation is not the same thing as a learner who got it
 * wrong, and collapsing that distinction would make every other verdict untrustworthy.
 */
export function ExerciseCard({
  exercise,
  topicId,
  progress,
}: {
  exercise: Exercise
  topicId: string
  progress?: ExerciseProgress
}) {
  const [answer, setAnswer] = useState(progress?.lastAnswer ?? '')
  const [explanation, setExplanation] = useState(progress?.lastExplanation ?? '')
  const [result, setResult] = useState<SubmissionState | null>(null)
  const [showSolution, setShowSolution] = useState(progress?.solutionRevealed ?? false)
  const [pending, startTransition] = useTransition()

  const needsExplanation = exercise.explain.required
  const canSubmit =
    answer.trim().length > 0 && (!needsExplanation || explanation.trim().length > 0) && !pending

  const settled: Verdict | null =
    result?.verdict ?? (progress?.autoVerdict === 'correct' ? 'correct' : null)

  const awaitingReview = result?.awaitingReview ?? progress?.awaitingReview ?? false

  const submit = () => {
    if (!canSubmit) return
    startTransition(async () => {
      const outcome = await submitExercise({
        topicId,
        exerciseId: exercise.id,
        answer,
        ...(needsExplanation ? { explanation } : {}),
      })
      setResult({
        verdict: outcome.autoVerdict,
        ...(outcome.detail !== undefined ? { detail: outcome.detail } : {}),
        awaitingReview: outcome.awaitingReview,
      })
    })
  }

  const reveal = () => {
    setShowSolution(true)
    startTransition(async () => {
      await revealSolution(topicId, exercise.id)
    })
  }

  return (
    <div
      id={`exercise-${exercise.id}`}
      className={cn(
        'scroll-mt-4 rounded-panel border px-4 py-3.5 transition-colors',
        settled === 'correct'
          ? 'border-success/40 bg-success-muted/10'
          : settled === 'incorrect'
            ? 'border-danger/40 bg-danger-muted/10'
            : 'border-border bg-surface/50',
      )}
    >
      <div className="mb-3 flex items-start gap-2.5">
        {exercise.label && (
          <span className="mt-0.5 shrink-0 rounded-md bg-surface-raised px-1.5 py-0.5 font-mono text-[0.7rem] text-fg-subtle">
            {exercise.label}
          </span>
        )}
        <p className="text-sm leading-relaxed text-fg">{exercise.prompt}</p>
      </div>

      {exercise.given && (
        <div className="mb-3 flex items-center gap-1.5">
          <p className="word-display text-3xl font-medium text-fg">{exercise.given}</p>
          <SpeakButton text={exercise.given} />
        </div>
      )}

      {exercise.kind === 'truefalse' ? (
        <fieldset disabled={pending} className="flex gap-2">
          <legend className="sr-only">Answer for {exercise.label ?? exercise.id}</legend>
          {(['true', 'false'] as const).map((value) => (
            <label
              key={value}
              className={cn(
                'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                answer === value
                  ? 'border-accent bg-accent-muted/30 text-fg'
                  : 'border-border bg-surface-sunken text-fg-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={`choice-${exercise.id}`}
                value={value}
                checked={answer === value}
                onChange={() => setAnswer(value)}
                className="size-3.5 accent-[var(--color-accent)]"
              />
              {value === 'true' ? 'True' : 'False'}
            </label>
          ))}
        </fieldset>
      ) : exercise.kind === 'multichoice' && exercise.choices ? (
        <fieldset disabled={pending} className="space-y-1.5">
          <legend className="sr-only">Answer for {exercise.label ?? exercise.id}</legend>
          {exercise.choices.map((choice) => (
            <label
              key={choice.id}
              className={cn(
                'word-display flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                answer === choice.id
                  ? 'border-accent bg-accent-muted/30 text-fg'
                  : 'border-border bg-surface-sunken text-fg-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={`choice-${exercise.id}`}
                value={choice.id}
                checked={answer === choice.id}
                onChange={() => setAnswer(choice.id)}
                className="size-3.5 accent-[var(--color-accent)]"
              />
              <span className="flex-1">{choice.label}</span>
              {containsCyrillic(choice.label) && <SpeakButton text={choice.label} />}
            </label>
          ))}
        </fieldset>
      ) : (
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Your answer"
          disabled={pending}
          className="word-display w-full rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-base text-fg outline-none focus:border-accent"
        />
      )}

      {needsExplanation && (
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Explain your answer — the reasoning is what gets reviewed here"
          disabled={pending}
          rows={2}
          className="mt-2 w-full resize-y rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-canvas transition disabled:opacity-40"
        >
          {pending ? 'Checking...' : 'Check'}
        </button>

        {!showSolution && (
          <button
            type="button"
            onClick={reveal}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-fg-subtle hover:bg-surface"
          >
            <Eye className="size-3.5" aria-hidden />
            Show answer
          </button>
        )}

        {settled === 'correct' && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="size-3.5" aria-hidden />
            Correct
          </span>
        )}
        {settled === 'incorrect' && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-danger">
            <XCircle className="size-3.5" aria-hidden />
            {result?.detail ?? 'Not quite'}
          </span>
        )}
        {result?.verdict === 'unverified' && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-fg-subtle">
            <HelpCircle className="size-3.5" aria-hidden />
            Can&apos;t check this automatically — your tutor will take a look
          </span>
        )}
      </div>

      {showSolution && (
        <div className="mt-3 rounded-lg border border-border bg-surface-sunken/60 px-3.5 py-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-fg-subtle">
            <Lightbulb className="size-3.5" aria-hidden />
            Answer
          </p>
          <p className="word-display text-sm leading-relaxed text-fg-muted">{exercise.solution}</p>
        </div>
      )}

      {awaitingReview && <ExerciseTutor topicId={topicId} exerciseId={exercise.id} />}
    </div>
  )
}
