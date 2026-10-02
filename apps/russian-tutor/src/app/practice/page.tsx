import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, NotebookPen, Plus } from 'lucide-react'

import { container } from '@/container'
import { createPracticePad } from './actions'
import { formatRelative } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Practice · Russian, from scratch' }

export default async function PracticeListPage() {
  const pads = await container.scratch.list()

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to lessons
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="poster text-4xl text-fg">Практика <span className="text-fg-subtle">· Practice</span></h1>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
            Write a sentence, a short dialogue, or anything you want feedback on — then send it to
            your tutor to review.
          </p>
        </div>

        <form
          action={async () => {
            'use server'
            await createPracticePad({})
          }}
        >
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 poster border-2 border-ink bg-accent px-4 py-2 text-sm text-accent-fg shadow-panel transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden />
            New
          </button>
        </form>
      </div>

      {pads.length === 0 ? (
        <div className="mt-10 rounded-panel border border-dashed border-border px-6 py-12 text-center">
          <NotebookPen className="mx-auto size-6 text-fg-subtle" aria-hidden />
          <p className="mt-3 text-sm font-medium text-fg">Nothing here yet.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
            Open a pad whenever you want to practice writing — your own sentences, not something
            copied from a lesson.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {pads.map((pad) => (
            <li key={pad.id}>
              <Link
                href={`/practice/${pad.id}`}
                className="flex items-center gap-4 rounded-panel border border-border bg-surface px-4 py-3 transition-colors hover:border-accent"
              >
                <NotebookPen className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-fg">{pad.title}</p>
                  <p className="text-sm text-fg-subtle">
                    {pad.stepCount} {pad.stepCount === 1 ? 'entry' : 'entries'} · edited{' '}
                    {formatRelative(pad.updatedAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
