import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, NotebookPen, Plus } from 'lucide-react'

import { container } from '@/container'
import { createScratchpad } from './actions'
import { formatRelative } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'مسودتك · الفيزياء بالعربي' }

export default async function ScratchListPage() {
  const pads = await container.scratch.list()

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
      >
        <ArrowRight className="size-3.5" aria-hidden />
        رجوع للدروس
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">مسودتك</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
            صفحة فاضية عشان تحل فيها. كل سطر بيتحقق مقابل اللي قبله، وتقدر تبعت الحل كله لأستاذك
            للمراجعة.
          </p>
        </div>

        <form
          action={async () => {
            'use server'
            await createScratchpad({})
          }}
        >
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" aria-hidden />
            جديد
          </button>
        </form>
      </div>

      {pads.length === 0 ? (
        <div className="mt-10 rounded-panel border border-dashed border-border px-6 py-12 text-center">
          <NotebookPen className="mx-auto size-6 text-fg-subtle" aria-hidden />
          <p className="mt-3 text-sm font-medium text-fg">مفيش حاجة هنا لسه.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
            افتح صفحة لما تحب تحل مسألة خطوة بخطوة — حلك انت، مش حل من المنهج.
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
                  <p className="text-sm text-fg-subtle">
                    {pad.stepCount} خطوة · اتعدّلت {formatRelative(pad.updatedAt)}
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
