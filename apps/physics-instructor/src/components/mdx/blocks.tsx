import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight, Info, Lightbulb } from 'lucide-react'

import { DisplayMath, M } from '@/components/math/Math'
import { cn } from '@/lib/utils'

/**
 * Lesson building blocks.
 *
 * These exist so the handbook's markdown tables and bare prose become semantic, responsive and
 * consistently styled — and so a table of axioms can render real typeset math instead of
 * `a(u + v) = au + av` in a monospace cell.
 */

const CALLOUT_KINDS = {
  why: {
    icon: Lightbulb,
    label: 'Why this matters',
    className: 'border-accent/40 bg-accent-muted/25',
    iconClass: 'text-accent',
  },
  note: {
    icon: Info,
    label: 'Note',
    className: 'border-border-strong bg-surface-raised/60',
    iconClass: 'text-fg-subtle',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Careful',
    className: 'border-warning/40 bg-warning-muted/25',
    iconClass: 'text-warning',
  },
  forward: {
    icon: ArrowRight,
    label: 'Where this leads',
    className: 'border-pending/40 bg-pending-muted/25',
    iconClass: 'text-pending',
  },
} as const

export type CalloutKind = keyof typeof CALLOUT_KINDS

export function Callout({
  kind = 'note',
  title,
  children,
}: {
  kind?: CalloutKind
  title?: string
  children: ReactNode
}) {
  const config = CALLOUT_KINDS[kind] ?? CALLOUT_KINDS.note
  const Icon = config.icon

  return (
    <aside className={cn('my-6 rounded-panel border px-4 py-3.5', config.className)}>
      <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg">
        <Icon className={cn('size-3.5', config.iconClass)} aria-hidden />
        {title ?? config.label}
      </p>
      <div className="text-sm leading-relaxed text-fg-muted [&>*+*]:mt-2">{children}</div>
    </aside>
  )
}

/**
 * A comparison table. Cells are plain strings; anything wrapped in `$...$` is rendered as math,
 * so a table can mix prose and notation without a second component.
 */
export function Compare({
  columns,
  rows,
  caption,
}: {
  columns: string[]
  rows: string[][]
  caption?: string
}) {
  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border">
      <div className="pane-scroll overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-raised">
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="border-b border-border px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-surface/40">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      'border-b border-border px-3.5 py-2.5 align-top',
                      j === 0 ? 'font-medium text-fg' : 'text-fg-muted',
                    )}
                  >
                    <MaybeMath text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <figcaption className="bg-surface/60 px-3.5 py-2 text-xs text-fg-subtle">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

/** Splits on `$...$` and renders those segments as inline math. */
function MaybeMath({ text }: { text: string }) {
  if (!text.includes('$')) return <>{text}</>

  const parts = text.split(/(\$[^$]+\$)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('$') && part.endsWith('$') && part.length > 2 ? (
          <M key={i}>{part.slice(1, -1)}</M>
        ) : (
          part
        ),
      )}
    </>
  )
}

/**
 * A list of axioms or rules: typeset statement on the left, plain-language meaning on the right.
 * Two columns rather than a paragraph, because the pairing *is* the content.
 */
export function Axioms({ items, caption }: { items: [string, string][]; caption?: string }) {
  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border">
      <dl className="divide-y divide-border">
        {items.map(([latex, meaning], i) => (
          <div
            key={i}
            className="grid gap-1.5 px-4 py-3 odd:bg-surface/40 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6"
          >
            <dt className="min-w-0">
              <DisplayMath latex={latex} className="text-left [&_.katex-display]:text-left" />
            </dt>
            <dd className="text-xs text-fg-subtle sm:text-right">{meaning}</dd>
          </div>
        ))}
      </dl>
      {caption && (
        <figcaption className="border-t border-border bg-surface/60 px-4 py-2 text-xs text-fg-subtle">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

/**
 * A worked derivation: numbered steps, each with an optional justification.
 *
 * Every step carries a `why` because the gap between "I can follow this" and "I could have written
 * this" is precisely the reason each line follows from the last.
 */
export function Derivation({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border bg-surface-sunken/40">
      {caption && (
        <figcaption className="border-b border-border bg-surface-raised/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {caption}
        </figcaption>
      )}
      <ol className="derivation-steps divide-y divide-border">{children}</ol>
    </figure>
  )
}

export function Step({ latex, why }: { latex: string; why?: string }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 px-4 py-3.5 marker:text-fg-subtle">
      <span
        aria-hidden
        className="mt-0.5 flex size-5 items-center justify-center rounded-full border border-border-strong text-[0.7rem] font-mono text-fg-subtle"
      >
        <span className="step-counter" />
      </span>
      <div className="min-w-0">
        <DisplayMath latex={latex} />
        {why && <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{why}</p>}
      </div>
    </li>
  )
}

/** Marks a definition so it is visually distinct from surrounding explanation. */
export function Definition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="my-5 rounded-panel border-l-2 border-accent bg-surface/50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">{term}</p>
      <div className="mt-1 text-sm leading-relaxed text-fg-muted">{children}</div>
    </div>
  )
}
