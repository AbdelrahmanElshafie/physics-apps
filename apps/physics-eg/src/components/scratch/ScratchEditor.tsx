'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
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
import type { StepVerdict, WorkingReport } from '@physics/scratchpad'
import { MathInput } from '@physics/math-ui'
import { useThreadMessages } from '@physics/tutor-bridge/react'
import { checkScratchpad, deleteScratchpad, requestScratchReview, saveScratchpad } from '@/app/scratch/actions'
import { cn, formatRelative } from '@/lib/utils'

/**
 * المسودة: حلّك انت، سطر واحد لكل خطوة.
 *
 * حاجتين ممكن تعملهم بيها. "تحقق من حلي" بتتأكد إن كل سطر جايّ صح من اللي قبله — وده اللي بيمسك
 * الغلطة اللي ممكن تحصل في خطوة وتتبني عليها خمس خطوات كاملين. "اسأل أستاذك" بتبعت الحل كله
 * للمراجعة — للحكم اللي المصحح التلقائي مقدرش يديه: هل الطريقة نفسها صح، مش بس الجبر متسق.
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

  // حفظ تلقائي، بتأخير بسيط. ضياع حل الطالب أسوأ بكتير من كتابة زيادة على القرص.
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
    // أي تعديل بيلغي النتيجة القديمة — إظهار علامات صح قديمة أسوأ من عدم إظهار حاجة.
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
        // نحفظ الأول، عشان اللي هيتراجَع واللي اتحقق منه يبقوا نفس الحاجة.
        await saveScratchpad({ id, title, steps })
        setDirty(false)
        setReport(await checkScratchpad(steps))
      } catch (cause) {
        console.error('[scratch] check failed', cause)
        setError(cause instanceof Error ? cause.message : 'معرفناش نتحقق من الحل.')
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
      setError(cause instanceof Error ? cause.message : 'معرفناش نبعت الحل.')
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
          <ArrowRight className="size-3.5" aria-hidden />
          كل المسودات
        </Link>
        {topicId && topicTitle && (
          <>
            <span className="text-fg-subtle" aria-hidden>
              ·
            </span>
            <Link
              href={`/lesson/${topicId.split(':')[0]}/${topicId.split(':')[1]}`}
              className="truncate text-xs text-accent hover:underline"
            >
              {topicTitle}
            </Link>
          </>
        )}
        <span className="mr-auto text-xs text-fg-subtle">
          {dirty ? 'بتتحفظ...' : savedAt ? `اتحفظت ${formatRelative(savedAt)}` : 'محفوظة'}
        </span>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          setDirty(true)
        }}
        aria-label="العنوان"
        className="w-full bg-transparent text-2xl font-semibold tracking-tight text-fg outline-none placeholder:text-fg-subtle"
        placeholder="مسودة بدون عنوان"
      />

      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        اكتب سطر واحد من الحل لكل خطوة. التحقق بيتأكد إن كل سطر جايّ صح من اللي قبله؛ أي حاجة عن
        <em> طريقة الحل</em> نفسها اسأل أستاذك فيها.
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
        ضيف خطوة
      </button>

      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-6">
        <button
          type="button"
          onClick={runCheck}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {checking ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ListChecks className="size-4" aria-hidden />
          )}
          {checking ? 'بيتحقق...' : 'تحقق من حلي'}
        </button>

        <button
          type="button"
          onClick={() => void deleteScratchpad(id)}
          className="mr-auto flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs text-fg-subtle transition-colors hover:border-danger hover:text-danger"
        >
          <Trash2 className="size-3.5" aria-hidden />
          امسح
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-panel border border-danger/40 bg-danger-muted/20 px-4 py-3 text-sm text-fg">
          {error}
        </p>
      )}

      {report && <ReportSummary report={report} />}

      <section className="mt-8 rounded-panel border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold text-fg">اسأل أستاذك</h2>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          بيبعت الحل كله للمراجعة — السؤال المناسب لما الجبر يطلع صح بس مش متأكد إن الطريقة نفسها
          صح.
        </p>

        <div className="mt-3 flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="حاجة معينة؟ (اختياري)"
            aria-label="سؤال عن الحل ده"
            className="flex-1 resize-y rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void askForReview()}
            disabled={reviewing}
            aria-label="ابعت الحل للمراجعة"
            className="rounded-lg bg-accent p-2.5 text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </div>

        {awaitingReview && !reply && (
          <p className="mt-3 rounded-lg border border-dashed border-pending/50 bg-pending-muted/20 px-3 py-2 text-xs leading-relaxed text-fg-muted">
            اتبعت. هو في طابور أستاذك دلوقتي —{' '}
            <code dir="ltr" className="font-mono text-fg-muted">
              pnpm tutor
            </code>{' '}
            في التيرمنال. الرد هيظهر هنا من غير ما تعمل ريفرش.
          </p>
        )}

        {reply && (
          <div className="mt-3 rounded-lg border border-accent/40 bg-accent-muted/25 px-3 py-2.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">
              الأستاذ
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
        <div className="mr-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowNote((v) => !v)}
            className="rounded px-1.5 py-0.5 text-[0.7rem] text-fg-subtle transition-colors hover:text-fg"
          >
            {showNote ? 'اخفي السبب' : 'ليه؟'}
          </button>
          <button
            type="button"
            onClick={onAdd}
            aria-label={`ضيف خطوة بعد خطوة ${index + 1}`}
            className="rounded p-1 text-fg-subtle transition-colors hover:text-accent"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`امسح خطوة ${index + 1}`}
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
        ariaLabel={`خطوة ${index + 1}`}
        placeholder="اكتب حلك"
      />

      {showNote && (
        <input
          value={step.note ?? ''}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="ليه الخطوة دي جايّة صح؟"
          aria-label={`سبب خطوة ${index + 1}`}
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
    return <span className="text-[0.7rem] text-fg-subtle">نقطة البداية</span>
  }
  if (verdict.status === 'follows') {
    return (
      <span className="flex items-center gap-1 text-[0.7rem] text-success">
        <Check className="size-3" aria-hidden />
        جايّة صح
      </span>
    )
  }
  if (verdict.status === 'broken') {
    return (
      <span className="flex items-center gap-1 text-[0.7rem] font-medium text-danger">
        <CircleAlert className="size-3" aria-hidden />
        مش جايّة صح
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[0.7rem] text-fg-subtle">
      <CircleHelp className="size-3" aria-hidden />
      متتحققش منها
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
          ? `خطوة ${report.firstBreak! + 1} مش جايّة صح من اللي قبلها.`
          : report.checked > 0
            ? 'كل خطوة اتحققنا منها جايّة صح من اللي قبلها.'
            : 'مفيش حاجة قدرنا نتحقق منها تلقائيًا.'}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-fg-muted">
        {report.checked} خطوة اتحقق منها
        {report.unchecked > 0 && `، و${report.unchecked} معرفناش نقرأها تلقائيًا`}.
        {broken && ' كل خطوة بعد الغلطة مبنية عليها، فصلّح السطر ده الأول.'}
        {report.unchecked > 0 && ' اسأل أستاذك عن أي حاجة معرفناش نتحقق منها.'}
      </p>
    </div>
  )
}
