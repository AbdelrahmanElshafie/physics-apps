'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Send, Trash2 } from 'lucide-react'

import type { ScratchStep } from '@core/domain'
import { useThreadMessages } from '@physics/tutor-bridge/react'
import { deletePracticePad, requestPracticeReview, savePracticePad } from '@/app/practice/actions'
import { formatRelative } from '@/lib/utils'

/**
 * Free writing practice: one entry per line of thought — a sentence, a short dialogue, a stab at
 * a translation. No local "is this right" check, because nothing here is checkable the way a math
 * step is; "Ask your tutor" sends the whole pad for a human read.
 */

const newEntryId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s${Date.now()}${Math.random().toString(16).slice(2)}`

export function PracticeEditor({
  id,
  initialTitle,
  initialEntries,
  topicId,
  topicTitle,
}: {
  id: string
  initialTitle: string
  initialEntries: ScratchStep[]
  topicId?: string
  topicTitle?: string
}) {
  const [title, setTitle] = useState(initialTitle)
  const [entries, setEntries] = useState<ScratchStep[]>(
    initialEntries.length > 0 ? initialEntries : [{ id: newEntryId(), latex: '' }],
  )
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [question, setQuestion] = useState('')
  const [error, setError] = useState<string | null>(null)

  const messages = useThreadMessages(`practice:${id}`)
  const reply = [...messages].reverse().find((m) => m.role === 'tutor')
  const awaitingReview = messages.some((m) => m.pending)

  // Autosave, lightly debounced. Losing someone's writing is far worse than an extra disk write.
  const saveTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!dirty) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)

    saveTimer.current = window.setTimeout(() => {
      void savePracticePad({ id, title, steps: entries }).then((r) => {
        setSavedAt(r.savedAt)
        setDirty(false)
      })
    }, 900)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [dirty, id, title, entries])

  const mutate = useCallback((next: ScratchStep[]) => {
    setEntries(next)
    setDirty(true)
  }, [])

  const updateEntry = (entryId: string, text: string) =>
    mutate(entries.map((e) => (e.id === entryId ? { ...e, latex: text } : e)))

  const addEntry = (afterIndex: number) => {
    const next = [...entries]
    next.splice(afterIndex + 1, 0, { id: newEntryId(), latex: '' })
    mutate(next)
  }

  const removeEntry = (entryId: string) =>
    mutate(entries.length === 1 ? [{ id: newEntryId(), latex: '' }] : entries.filter((e) => e.id !== entryId))

  const askForReview = async () => {
    setReviewing(true)
    setError(null)
    try {
      await savePracticePad({ id, title, steps: entries })
      setDirty(false)
      await requestPracticeReview({ id, ...(question.trim() ? { question: question.trim() } : {}) })
      setQuestion('')
    } catch (cause) {
      console.error('[practice] review request failed', cause)
      setError(cause instanceof Error ? cause.message : 'Could not send this for review.')
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/practice"
          className="flex items-center gap-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All practice
        </Link>
        {topicId && topicTitle && (
          <>
            <span className="text-fg-subtle" aria-hidden>
              ·
            </span>
            <Link
              href={`/lesson/${topicId.split(':')[0]}/${topicId.split(':')[1]}`}
              className="truncate text-sm text-accent hover:underline"
            >
              {topicTitle}
            </Link>
          </>
        )}
        <span className="ms-auto text-sm text-fg-subtle">
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
        placeholder="Untitled practice"
      />

      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        One entry per line of thought — Russian, English, any mix. There is no automatic
        verdict here; that is what the tutor panel below is for.
      </p>

      <ol className="mt-7 space-y-3">
        {entries.map((entry, index) => (
          <li key={entry.id}>
            <EntryRow
              index={index}
              entry={entry}
              onChange={(text) => updateEntry(entry.id, text)}
              onAdd={() => addEntry(index)}
              onRemove={() => removeEntry(entry.id)}
              canRemove={entries.length > 1 || entry.latex.length > 0}
            />
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => addEntry(entries.length - 1)}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-fg-subtle transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="size-3.5" aria-hidden />
        Add entry
      </button>

      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => void deletePracticePad(id)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-sm text-fg-subtle transition-colors hover:border-danger hover:text-danger"
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

      <section className="mt-8 rounded-panel border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold text-fg">Ask your tutor</h2>
        <p className="mt-1 text-sm leading-relaxed text-fg-muted">
          Sends everything above for review — good for &quot;did I say this right?&quot; once the writing
          itself feels done.
        </p>

        <div className="mt-3 flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="Anything specific? (optional)"
            aria-label="Question about this writing"
            className="flex-1 resize-y rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void askForReview()}
            disabled={reviewing}
            aria-label="Send for review"
            className="rounded-lg bg-accent p-2.5 text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </div>

        {awaitingReview && !reply && (
          <p className="mt-3 rounded-lg border border-dashed border-pending/50 bg-pending-muted/20 px-3 py-2 text-sm leading-relaxed text-fg-muted">
            Sent. It&apos;s in your tutor&apos;s queue now —{' '}
            <code className="font-mono text-fg-muted">pnpm tutor</code> in the terminal. The reply
            will show up here with no refresh needed.
          </p>
        )}

        {reply && (
          <div className="mt-3 rounded-lg border border-accent/40 bg-accent-muted/25 px-3 py-2.5">
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-accent">Tutor</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">{reply.body}</p>
          </div>
        )}
      </section>
    </div>
  )
}

function EntryRow({
  index,
  entry,
  onChange,
  onAdd,
  onRemove,
  canRemove,
}: {
  index: number
  entry: ScratchStep
  onChange: (text: string) => void
  onAdd: () => void
  onRemove: () => void
  canRemove: boolean
}) {
  return (
    <div className="rounded-panel border border-border bg-surface/40 p-3 transition-colors">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-[0.7rem] text-fg-subtle">
          {index + 1}
        </span>
        <div className="ms-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add entry after ${index + 1}`}
            className="rounded p-1 text-fg-subtle transition-colors hover:text-accent"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Delete entry ${index + 1}`}
              className="rounded p-1 text-fg-subtle transition-colors hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <textarea
        value={entry.latex}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write something..."
        rows={2}
        className="word-display w-full resize-y rounded-lg border border-border bg-surface-sunken px-3 py-2 text-base text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
      />
    </div>
  )
}
