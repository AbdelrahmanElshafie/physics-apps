'use client'

import { useState, useTransition } from 'react'
import { Send } from 'lucide-react'

import { useThreadMessages } from '@physics/tutor-bridge/react'
import { sendQuestion } from '@/app/actions'
import { cn } from '@/lib/utils'

/**
 * A tiny per-exercise thread: shown once an attempt is `awaitingReview`, so the instructor sees
 * exactly what the student tried and can reply — and the student can ask a follow-up without
 * leaving the exercise. Relies on a `TutorStreamProvider` (topic-scoped) further up the tree; see
 * the lesson page.
 */
export function ExerciseTutor({
  topicId,
  exerciseId,
}: {
  topicId: string
  exerciseId: string
}) {
  const threadId = `${topicId}#${exerciseId}`
  const messages = useThreadMessages(threadId)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()

  const send = () => {
    const body = draft.trim()
    if (!body || pending) return
    setDraft('')
    startTransition(async () => {
      await sendQuestion({ body, topicId, exerciseId })
    })
  }

  return (
    <div className="mt-3 rounded-lg border border-accent/30 bg-accent-muted/10 px-3.5 py-2.5">
      <p className="mb-2 text-sm font-semibold text-accent">استنى، الأستاذ هيراجع إجابتك</p>

      {messages.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'rounded-md px-3 py-2 text-sm leading-relaxed',
                m.role === 'tutor' ? 'bg-surface-raised text-fg' : 'bg-surface/60 text-fg-muted',
              )}
            >
              <span className="mb-0.5 block font-semibold text-fg-subtle">
                {m.role === 'tutor' ? 'الأستاذ' : 'انت'}
                {m.pending && ' · لسه ما اتردش عليه'}
              </span>
              {m.body}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="اسأل حاجة عن السؤال ده..."
          disabled={pending}
          className="w-full rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || draft.trim().length === 0}
          className="flex shrink-0 items-center justify-center rounded-lg bg-accent p-1.5 text-canvas disabled:opacity-40"
          aria-label="ابعت السؤال"
        >
          <Send className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
