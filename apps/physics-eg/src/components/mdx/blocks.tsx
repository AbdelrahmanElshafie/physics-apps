import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight, Info, Lightbulb } from 'lucide-react'

import { DisplayMath, MixedText } from '@/components/math/Math'
import { cn } from '@/lib/utils'

/** Lesson building blocks — same shapes as physics-instructor's, Arabic-labelled from the start. */

const CALLOUT_KINDS = {
  why: { icon: Lightbulb, label: 'ليه ده مهم', className: 'border-accent/40 bg-accent-muted/25', iconClass: 'text-accent' },
  note: { icon: Info, label: 'ملاحظة', className: 'border-border-strong bg-surface-raised/60', iconClass: 'text-fg-subtle' },
  warning: { icon: AlertTriangle, label: 'خلي بالك', className: 'border-warning/40 bg-warning-muted/25', iconClass: 'text-warning' },
  forward: { icon: ArrowRight, label: 'جاي بعد كده', className: 'border-accent/30 bg-surface-raised/50', iconClass: 'text-accent' },
} as const

export type CalloutKind = keyof typeof CALLOUT_KINDS

export function Callout({ kind = 'note', title, children }: { kind?: CalloutKind; title?: string; children: ReactNode }) {
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

export function Compare({ columns, rows, caption }: { columns: string[]; rows: string[][]; caption?: string }) {
  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border">
      <div className="pane-scroll overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-raised">
              {columns.map((col) => (
                <th key={col} scope="col" className="border-b border-border px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-surface/40">
                {row.map((cell, j) => (
                  <td key={j} className={cn('border-b border-border px-3.5 py-2.5 align-top', j === 0 ? 'font-medium text-fg' : 'text-fg-muted')}>
                    <MixedText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <figcaption className="bg-surface/60 px-3.5 py-2 text-xs text-fg-subtle">{caption}</figcaption>}
    </figure>
  )
}

export function Derivation({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border bg-surface-sunken/40">
      {caption && (
        <figcaption className="border-b border-border bg-surface-raised/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {caption}
        </figcaption>
      )}
      <ol className="derivation-steps divide-y divide-border list-none">{children}</ol>
    </figure>
  )
}

export function Step({ latex, why }: { latex: string; why?: string }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 px-4 py-3.5">
      <span aria-hidden className="mt-0.5 flex size-5 items-center justify-center rounded-full border border-border-strong text-[0.7rem] font-mono text-fg-subtle">
        <span className="step-counter" />
      </span>
      <div className="min-w-0">
        <DisplayMath latex={latex} />
        {why && <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{why}</p>}
      </div>
    </li>
  )
}
