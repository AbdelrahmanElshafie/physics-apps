'use client'

import { useState, useTransition } from 'react'
import { MessageCircleQuestion, Send } from 'lucide-react'

import { useThreadMessages } from '@physics/tutor-bridge/react'
import { sendQuestion } from '@/app/actions'
import { cn } from '@/lib/utils'

/**
 * Open-ended chat with the tutor about the current lesson — not tied to any exercise, and not
 * gated behind getting something wrong first. `ExerciseTutor` only appears once an attempt is
 * `awaitingReview`; this is the "I just want to ask something" door, always open.
 *
 * Threaded on the bare topic id (no `#exerciseId` suffix), which `TutorStreamProvider` already
 * subscribes to as part of the same topic-scoped stream every exercise thread on this page uses —
 * no separate connection, just a different thread id.
 */
export function LessonTutorChat({ topicId }: { topicId: string }) {
  const messages = useThreadMessages(topicId)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()

  const send = () => {
    const body = draft.trim()
    if (!body || pending) return
    setDraft('')
    startTransition(async () => {
      await sendQuestion({ body, topicId })
    })
  }

  return (
    <section className="mt-8 rounded-panel border border-border bg-surface/50 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
        <MessageCircleQuestion className="size-4 text-accent" aria-hidden />
        Ask your tutor about this lesson
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-fg-muted">
        Anything unclear, want something explained a different way, or just curious about
        something the lesson didn&apos;t cover — ask here. Replies show up live, no refresh needed.
      </p>

      {messages.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'rounded-md px-3 py-2 text-sm leading-relaxed',
                m.role === 'tutor' ? 'bg-surface-raised text-fg' : 'bg-surface/60 text-fg-muted',
              )}
            >
              <span className="mb-0.5 block font-semibold text-fg-subtle">
                {m.role === 'tutor' ? 'Tutor' : 'You'}
                {m.pending && ' · not answered yet'}
              </span>
              <span className="whitespace-pre-wrap">{m.body}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={2}
          placeholder="Ask something... (Enter to send, Shift+Enter for a new line)"
          disabled={pending}
          className="flex-1 resize-y rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || draft.trim().length === 0}
          aria-label="Send"
          className="flex shrink-0 items-center justify-center rounded-lg bg-accent p-2.5 text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  )
}
