import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, NotebookPen, Plus } from 'lucide-react'

import { container } from '@/container'
import { createScratchpad } from './actions'
import { formatRelative } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Working' }

export default async function ScratchListPage() {
  const pads = await container().scratch.list()

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-xs text-fg-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to lessons
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Your working</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
            A blank page for solving things. Each line is checked against the one before it, and
            you can send the whole derivation to me for review.
          </p>
        </div>

        <form action={async () => { 'use server'; await createScratchpad({}) }}>
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
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
            Start a page when you want to work a problem through step by step — yours, not one
            from the syllabus.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {pads.map((pad) => (
            <li key={pad.id}>
              <Link
                href={`/scratch/${pad.id}`}
                className="flex items-center gap-4 rounded-panel border border-border bg-surface px-4 py-3 transition-colors hover:border-accent"
              >
                <NotebookPen className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-fg">{pad.title}</p>
                  <p className="text-xs text-fg-subtle">
                    {pad.stepCount} step{pad.stepCount === 1 ? '' : 's'} · edited{' '}
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
