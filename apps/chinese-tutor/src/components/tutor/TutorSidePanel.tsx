'use client'

import { useState, useTransition } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'

import { useThreadMessages, useTutorStream } from '@physics/tutor-bridge/react'
import { sendQuestion } from '@/app/actions'
import { cn } from '@/lib/utils'

/**
 * One persistent chat with the tutor, open from anywhere in the app — not scoped to whichever
 * lesson happens to be open. Threaded on `'general'` (what `threadFor({})` resolves to with no
 * topic or exercise given), via the `TutorStreamProvider topicId="general"` wrapping the whole
 * app in the root layout. A lesson page's own, topic-scoped provider nests *inside* this one for
 * its exercise threads — unrelated streams, no interference.
 *
 * This is the single place to ask "can you explain/describe something," independent of which
 * lesson or exercise prompted the question — exactly the ask that a per-lesson, scroll-to-find
 * chat box doesn't satisfy.
 */
const GENERAL_THREAD = 'general'

export function TutorSidePanel() {
  const [open, setOpen] = useState(false)
  const messages = useThreadMessages(GENERAL_THREAD)
  const { connected } = useTutorStream()
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()

  const unread = messages.some((m) => m.role === 'tutor') && !open

  const send = () => {
    const body = draft.trim()
    if (!body || pending) return
    setDraft('')
    startTransition(async () => {
      await sendQuestion({ body })
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open chat with your tutor"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-fg shadow-panel transition hover:opacity-90"
      >
        <MessageCircle className="size-4" aria-hidden />
        Ask your tutor
        {unread && <span className="size-2 rounded-full bg-canvas" aria-hidden />}
      </button>
    )
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-border bg-surface shadow-panel sm:inset-y-4 sm:right-4 sm:rounded-panel sm:border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-fg">Your tutor</p>
          <p className="text-xs text-fg-subtle">
            One ongoing conversation — ask about anything, any lesson.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-sunken hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {!connected && (
        <p className="flex items-center gap-1.5 border-b border-warning/30 bg-warning-muted/20 px-4 py-2 text-xs font-medium text-warning">
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-warning" aria-hidden />
          Reconnecting... replies won&apos;t appear here until this clears.
        </p>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="text-sm text-fg-subtle">
            Nothing yet. Ask about a word, a grammar point, or anything you&apos;re stuck on —
            your tutor can see what you&apos;ve done in the course so far.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'rounded-md px-3 py-2 text-sm leading-relaxed',
                m.role === 'tutor' ? 'bg-surface-raised text-fg' : 'bg-surface-sunken text-fg-muted',
              )}
            >
              <span className="mb-0.5 block text-xs font-semibold text-fg-subtle">
                {m.role === 'tutor' ? 'Tutor' : 'You'}
                {m.pending && ' · not answered yet'}
              </span>
              <span className="whitespace-pre-wrap">{m.body}</span>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
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
          placeholder="Ask your tutor anything..."
          disabled={pending}
          className="flex-1 resize-none rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || draft.trim().length === 0}
          aria-label="Send"
          className="flex shrink-0 items-center justify-center rounded-lg bg-accent p-2.5 text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
