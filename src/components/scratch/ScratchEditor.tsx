'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CircleHelp,
  ListChecks,
  Loader2,
  Plus,
  Send,
  Trash2,
} from 'lucide-react'

import type { ScratchStep } from '@core/domain'
import type { StepVerdict, WorkingReport } from '@core/services'
import { MathInput } from '@/components/math/MathInput'
import { useThreadMessages } from '@/components/workspace/TutorStream'
import { checkScratchpad, deleteScratchpad, requestScratchReview, saveScratchpad } from '@/app/scratch/actions'
import { cn, formatRelative } from '@/lib/utils'

/**
 * The scratchpad editor: your own working, one line per step.
 *
 * Two things can happen to it. "Check my working" verifies each line against the one before,
 * which catches the sign lost in step three that the next five steps faithfully preserve. "Ask
 * for review" sends the whole derivation to me, for the judgement a CAS cannot make — whether the
 * approach is right, not merely whether the algebra is consistent.
 */

const newStepId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s${Date.now()}${Math.random().toString(16).slice(2)}`

export function ScratchEditor({
  id,
  initialTitle,
  initialSteps,
  topicId,
  topicTitle,
}: {
  id: string
  initialTitle: string
  initialSteps: ScratchStep[]
  topicId?: string
  topicTitle?: string
}) {
  const [title, setTitle] = useState(initialTitle)
  const [steps, setSteps] = useState<ScratchStep[]>(
    initialSteps.length > 0 ? initialSteps : [{ id: newStepId(), latex: '' }],
  )
  const [report, setReport] = useState<WorkingReport | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [checking, startChecking] = useTransition()
  const [reviewing, setReviewing] = useState(false)
  const [question, setQuestion] = useState('')
  const [error, setError] = useState<string | null>(null)

  const messages = useThreadMessages(`scratch:${id}`)
  const reply = [...messages].reverse().find((m) => m.role === 'tutor')
  const awaitingReview = messages.some((m) => m.pending)

  // Autosave, debounced. Working you lose is worse than a few extra writes.
  const saveTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!dirty) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)

    saveTimer.current = window.setTimeout(() => {
      void saveScratchpad({ id, title, steps }).then((r) => {
        setSavedAt(r.savedAt)
        setDirty(false)
      })
    }, 900)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [dirty, id, title, steps])

  const mutate = useCallback((next: ScratchStep[]) => {
    setSteps(next)
    setDirty(true)
    // Any edit invalidates the previous verdicts; showing stale ticks would be worse than none.
    setReport(null)
  }, [])

  const updateStep = (stepId: string, patch: Partial<ScratchStep>) =>
    mutate(steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)))

  const addStep = (afterIndex: number) => {
    const next = [...steps]
    next.splice(afterIndex + 1, 0, { id: newStepId(), latex: '' })
    mutate(next)
  }

  const removeStep = (stepId: string) =>
    mutate(steps.length === 1 ? [{ id: newStepId(), latex: '' }] : steps.filter((s) => s.id !== stepId))

  const runCheck = () =>
    startChecking(async () => {
      setError(null)
      try {
        // Save first so what I review and what was checked are the same thing.
        await saveScratchpad({ id, title, steps })
        setDirty(false)
        setReport(await checkScratchpad(steps))
      } catch (cause) {
        // Without this the transition never settles and the button spins forever, which reads
        // as a hang rather than a failure.
        console.error('[scratch] check failed', cause)
        setError(cause instanceof Error ? cause.message : 'Could not check the working.')
      }
    })

  const askForReview = async () => {
    setReviewing(true)
    setError(null)
    try {
      await saveScratchpad({ id, title, steps })
      setDirty(false)
      await requestScratchReview({ id, ...(question.trim() ? { question: question.trim() } : {}) })
      setQuestion('')
    } catch (cause) {
      console.error('[scratch] review request failed', cause)
      setError(cause instanceof Error ? cause.message : 'Could not send the working.')
    } finally {
      setReviewing(false)
    }
  }

  const verdictFor = (stepId: string): StepVerdict | undefined =>
    report?.verdicts.find((v) => v.stepId === stepId)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/scratch"
          className="flex items-center gap-1.5 text-xs text-fg-subtle transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All working
        </Link>
        {topicId && topicTitle && (
          <>
            <span className="text-fg-subtle" aria-hidden>
              ·
            </span>
            <Link
              href={`/learn/${topicId.split(':')[0]}/${topicId.split(':')[1]}`}
              className="truncate text-xs text-accent hover:underline"
            >
              {topicTitle}
            </Link>
          </>
        )}
        <span className="ml-auto text-xs text-fg-subtle">
          {dirty ? 'Saving...' : savedAt ? `Saved ${formatRelative(savedAt)}` : 'Saved'}
        </span>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          setDirty(true)
        }}
        aria-label="Title"
        className="w-full bg-transparent text-2xl font-semibold tracking-tight text-fg outline-none placeholder:text-fg-subtle"
        placeholder="Untitled working"
      />

      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        Write one line of working per step. Checking verifies each line against the one before it;
        for anything about your <em>approach</em>, ask me.
      </p>

      <ol className="mt-7 space-y-3">
        {steps.map((step, index) => (
          <li key={step.id}>
            <StepRow
              index={index}
              step={step}
              verdict={verdictFor(step.id)}
              onChange={(patch) => updateStep(step.id, patch)}
              onAdd={() => addStep(index)}
              onRemove={() => removeStep(step.id)}
              canRemove={steps.length > 1 || step.latex.length > 0}
            />
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => addStep(steps.length - 1)}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-fg-subtle transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="size-3.5" aria-hidden />
        Add step
      </button>

      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-6">
        <button
          type="button"
          onClick={runCheck}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {checking ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ListChecks className="size-4" aria-hidden />
          )}
          {checking ? 'Checking...' : 'Check my working'}
        </button>

        <button
          type="button"
          onClick={() => void deleteScratchpad(id)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs text-fg-subtle transition-colors hover:border-danger hover:text-danger"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Delete
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-panel border border-danger/40 bg-danger-muted/20 px-4 py-3 text-sm text-fg">
          {error}
        </p>
      )}

      {report && <ReportSummary report={report} />}

      <section className="mt-8 rounded-panel border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold text-fg">Ask your instructor</h2>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          Sends this whole derivation for review — the right question to ask when the algebra
          checks out but you are not sure the approach does.
        </p>

        <div className="mt-3 flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="Anything specific? (optional)"
            aria-label="Question about this working"
            className="flex-1 resize-y rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void askForReview()}
            disabled={reviewing}
            aria-label="Send working for review"
            className="rounded-lg bg-accent p-2.5 text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </div>

        {awaitingReview && !reply && (
          <p className="mt-3 rounded-lg border border-dashed border-pending/50 bg-pending-muted/20 px-3 py-2 text-xs leading-relaxed text-fg-muted">
            Sent. It is in my queue — run{' '}
            <code className="font-mono text-fg-muted">pnpm tutor</code> in the terminal. The reply
            appears here without a refresh.
          </p>
        )}

        {reply && (
          <div className="mt-3 rounded-lg border border-accent/40 bg-accent-muted/25 px-3 py-2.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
              Instructor
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">{reply.body}</p>
          </div>
        )}
      </section>
    </div>
  )
}

function StepRow({
  index,
  step,
  verdict,
  onChange,
  onAdd,
  onRemove,
  canRemove,
}: {
  index: number
  step: ScratchStep
  verdict?: StepVerdict
  onChange: (patch: Partial<ScratchStep>) => void
  onAdd: () => void
  onRemove: () => void
  canRemove: boolean
}) {
  const [showNote, setShowNote] = useState(Boolean(step.note))

  return (
    <div
      className={cn(
        'rounded-panel border bg-surface/40 p-3 transition-colors',
        verdict?.status === 'broken'
          ? 'border-danger/50'
          : verdict?.status === 'follows'
            ? 'border-success/40'
            : 'border-border',
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-[0.7rem] text-fg-subtle">
          {index + 1}
        </span>
        <StepBadge verdict={verdict} />
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowNote((v) => !v)}
            className="rounded px-1.5 py-0.5 text-[0.7rem] text-fg-subtle transition-colors hover:text-fg"
          >
            {showNote ? 'hide why' : 'why?'}
          </button>
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add a step after step ${index + 1}`}
            className="rounded p-1 text-fg-subtle transition-colors hover:text-accent"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Delete step ${index + 1}`}
              className="rounded p-1 text-fg-subtle transition-colors hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <MathInput
        value={step.latex}
        onChange={(latex) => onChange({ latex })}
        onSubmit={onAdd}
        ariaLabel={`Step ${index + 1}`}
        placeholder="Your working"
      />

      {showNote && (
        <input
          value={step.note ?? ''}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Why does this step follow?"
          aria-label={`Reason for step ${index + 1}`}
          className="mt-2 w-full rounded-lg border border-border bg-surface-sunken px-3 py-1.5 text-xs text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
      )}

      {verdict?.detail && (
        <p
          className={cn(
            'mt-2 text-xs',
            verdict.status === 'broken' ? 'text-danger' : 'text-fg-subtle',
          )}
        >
          {verdict.detail}
        </p>
      )}
    </div>
  )
}

function StepBadge({ verdict }: { verdict?: StepVerdict }) {
  if (!verdict || verdict.status === 'empty') return null

  if (verdict.status === 'start') {
    return <span className="text-[0.7rem] text-fg-subtle">starting point</span>
  }
  if (verdict.status === 'follows') {
    return (
      <span className="flex items-center gap-1 text-[0.7rem] text-success">
        <Check className="size-3" aria-hidden />
        follows
      </span>
    )
  }
  if (verdict.status === 'broken') {
    return (
      <span className="flex items-center gap-1 text-[0.7rem] font-medium text-danger">
        <CircleAlert className="size-3" aria-hidden />
        does not follow
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[0.7rem] text-fg-subtle">
      <CircleHelp className="size-3" aria-hidden />
      not checked
    </span>
  )
}

function ReportSummary({ report }: { report: WorkingReport }) {
  const broken = report.firstBreak !== null

  return (
    <div
      className={cn(
        'mt-4 rounded-panel border px-4 py-3',
        broken ? 'border-danger/40 bg-danger-muted/20' : 'border-success/40 bg-success-muted/20',
      )}
    >
      <p className="text-sm font-medium text-fg">
        {broken
          ? `Step ${report.firstBreak! + 1} does not follow from the one before it.`
          : report.checked > 0
            ? 'Every checked step follows from the one before.'
            : 'Nothing could be checked automatically.'}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-fg-muted">
        {report.checked} step{report.checked === 1 ? '' : 's'} verified
        {report.unchecked > 0 && `, ${report.unchecked} could not be read automatically`}.
        {broken && ' Everything after a break is built on it, so fix that line first.'}
        {report.unchecked > 0 && ' Ask me about anything unchecked.'}
      </p>
    </div>
  )
}
