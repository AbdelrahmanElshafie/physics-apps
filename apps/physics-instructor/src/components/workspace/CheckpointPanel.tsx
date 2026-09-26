'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Flag } from 'lucide-react'

import { passCheckpoint } from '@/app/actions'

/**
 * Marks a topic complete.
 *
 * Deliberately a manual act rather than something inferred from a score. Deciding you understand
 * something is the learner's call, and an automatic checkpoint would either fire too early or
 * quietly never fire on the tutor-graded questions that make up most of this material.
 */
export function CheckpointPanel({
  topicId,
  topicTitle,
  passed,
  outstanding,
}: {
  topicId: string
  topicTitle: string
  passed: boolean
  outstanding: number
}) {
  const [note, setNote] = useState('')
  const [pending, startTransition] = useTransition()

  if (passed) {
    return (
      <section className="mt-12 flex items-center gap-3 rounded-panel border border-success/40 bg-success-muted/25 px-4 py-3.5">
        <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
        <div>
          <p className="text-sm font-medium text-fg">Checkpoint passed</p>
          <p className="text-xs text-fg-muted">
            {topicTitle} is marked complete. Anything that depends on it is now unlocked.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-12 rounded-panel border border-border bg-surface/50 px-4 py-4">
      <div className="flex items-start gap-3">
        <Flag className="mt-0.5 size-5 shrink-0 text-fg-subtle" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">Mark this topic complete</p>
          <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
            {outstanding > 0
              ? `${outstanding} exercise${outstanding === 1 ? '' : 's'} not yet settled. You can still mark it complete if you are confident.`
              : 'Everything here is settled.'}
          </p>

          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note to your future self"
            className="mt-3 w-full rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />

          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => { await passCheckpoint(topicId, note) })}
            className="mt-3 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Mark complete'}
          </button>
        </div>
      </div>
    </section>
  )
}
