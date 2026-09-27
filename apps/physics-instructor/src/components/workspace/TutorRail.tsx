'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, Radio, Send, Terminal, X } from 'lucide-react'

import { readThread, sendQuestion } from '@/app/actions'
import { useWorkspace } from '@/stores/workspace'
import { cn, formatRelative } from '@/lib/utils'

import { useThreadMessages, useTutorStream, type ThreadMessage } from '@physics/tutor-bridge/react'

/**
 * The tutor conversation.
 *
 * Its waiting state is driven by the transport's declared capabilities, not by a hardcoded guess:
 * `latency: 'deferred'` shows "queued for your instructor" and names the command I run to answer,
 * while an `interactive` transport (the API adapter in M3) will show a live stream instead. No
 * component here needs to know *which* transport is connected.
 */

type Message = ThreadMessage

export function TutorRail({ topicId, topicTitle }: { topicId: string; topicTitle: string }) {
  const { askContext, draft, setDraft, clearAsk } = useWorkspace()
  const [history, setHistory] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  // The thread follows what the question is about, so asking about an equation and asking about
  // an exercise are separate conversations rather than one undifferentiated log.
  const threadId = askContext?.exerciseId
    ? `${topicId}#${askContext.exerciseId}`
    : askContext?.equationId
      ? `${topicId}@${askContext.equationId}`
      : topicId

  // Seed from disk so the conversation is there on first paint, then let the live stream take over.
  useEffect(() => {
    let cancelled = false
    void readThread(threadId).then((loaded) => {
      if (!cancelled) setHistory(loaded as Message[])
    })
    return () => {
      cancelled = true
    }
  }, [threadId])

  const live = useThreadMessages(threadId)
  const { capabilities, connected } = useTutorStream()

  // The stream replays the whole thread on connect, so it supersedes the seed where ids overlap.
  const messages = [...history.filter((h) => !live.some((l) => l.id === h.id)), ...live].sort((a, b) =>
    a.ts.localeCompare(b.ts),
  )

  // Keep the newest message in view, but only when already near the bottom, so reading back
  // through history is not yanked away by an arriving reply.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = useCallback(async () => {
    const body = draft.trim()
    if (body.length === 0 || sending) return

    setSending(true)
    try {
      await sendQuestion({
        body,
        topicId,
        ...(askContext?.exerciseId !== undefined ? { exerciseId: askContext.exerciseId } : {}),
        ...(askContext?.equationId !== undefined ? { equationId: askContext.equationId } : {}),
        ...(askContext?.equationLatex !== undefined
          ? { equationLatex: askContext.equationLatex }
          : {}),
        ...(askContext?.equationLabel !== undefined
          ? { equationLabel: askContext.equationLabel }
          : {}),
      })
      setDraft('')
    } finally {
      setSending(false)
    }
  }, [draft, sending, topicId, askContext, setDraft])

  const openQuestions = messages.filter((m) => m.pending).length

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-fg">Instructor</h2>
          <p className="truncate text-xs text-fg-subtle">{topicTitle}</p>
        </div>
        <span
          title={connected ? 'Live connection open' : 'Reconnecting'}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.7rem]',
            connected
              ? 'border-success/40 bg-success-muted/30 text-success'
              : 'border-border bg-surface-raised text-fg-subtle',
          )}
        >
          <Radio className="size-3" aria-hidden />
          {connected ? 'live' : '...'}
        </span>
      </header>

      {askContext && (
        <div className="flex items-start gap-2 border-b border-border bg-accent-muted/20 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-accent">
              Asking about
            </p>
            <p className="truncate text-xs text-fg-muted">
              {askContext.equationLabel ??
                askContext.exerciseLabel ??
                askContext.equationId ??
                askContext.exerciseId ??
                'this topic'}
            </p>
          </div>
          <button
            type="button"
            onClick={clearAsk}
            aria-label="Clear question context"
            className="shrink-0 rounded p-0.5 text-fg-subtle hover:text-fg"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}

      <div ref={scroller} className="pane-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((message) => <Bubble key={message.id} message={message} />)
        )}

        {openQuestions > 0 && capabilities?.latency === 'deferred' && (
          <div className="rounded-lg border border-dashed border-pending/50 bg-pending-muted/20 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-pending">
              <Clock className="size-3.5" aria-hidden />
              {openQuestions} waiting for a reply
            </p>
            <p className="mt-1.5 flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-fg-subtle">
              <Terminal className="mt-0.5 size-3 shrink-0" aria-hidden />
              <span>
                Answered from Claude Code — run <code className="font-mono text-fg-muted">pnpm tutor</code>{' '}
                in the terminal. The reply lands here on its own.
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            rows={2}
            placeholder="Ask about this topic..."
            aria-label="Question for your instructor"
            className="min-h-[2.75rem] flex-1 resize-y rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={draft.trim().length === 0 || sending}
            aria-label="Send question"
            className="rounded-lg bg-accent p-2.5 text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1.5 text-[0.7rem] text-fg-subtle">
          Enter to send, Shift+Enter for a new line.
        </p>
      </div>
    </aside>
  )
}

function EmptyState() {
  return (
    <div className="rounded-panel border border-dashed border-border px-4 py-6 text-center">
      <p className="text-sm text-fg-muted">No questions on this topic yet.</p>
      <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">
        Ask anything here, or use the question mark on an equation to ask about that exact step.
      </p>
    </div>
  )
}

function Bubble({ message }: { message: Message }) {
  const isLearner = message.role === 'learner'

  return (
    <div className={cn('flex flex-col gap-1', isLearner ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[92%] rounded-panel border px-3 py-2',
          isLearner
            ? 'border-accent/40 bg-accent-muted/25'
            : 'border-border bg-surface-raised',
        )}
      >
        {message.context?.equationLatex && (
          <p className="mb-1.5 truncate border-b border-border/60 pb-1.5 font-mono text-[0.7rem] text-fg-subtle">
            {message.context.equationLatex}
          </p>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{message.body}</p>
      </div>

      <div className="flex items-center gap-2 px-1 text-[0.7rem] text-fg-subtle">
        <span>{isLearner ? 'You' : 'Instructor'}</span>
        <span aria-hidden>·</span>
        <time dateTime={message.ts}>{formatRelative(message.ts)}</time>
        {message.pending && (
          <>
            <span aria-hidden>·</span>
            <span className="flex items-center gap-1 text-pending">
              <Clock className="size-3" aria-hidden />
              queued
            </span>
          </>
        )}
      </div>
    </div>
  )
}
