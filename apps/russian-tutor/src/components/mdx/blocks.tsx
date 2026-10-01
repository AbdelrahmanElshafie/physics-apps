import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight, Info, Lightbulb, Volume2 } from 'lucide-react'

import { containsCyrillic } from '@core/domain'
import { SpeakButton } from '@/components/audio/SpeakButton'
import { cn } from '@/lib/utils'

/** Lesson building blocks for a language course — vocab, dialogue, grammar, asides. */

const CALLOUT_KINDS = {
  why: { icon: Lightbulb, label: 'Why this matters', className: 'border-accent/40 bg-accent-muted/25', iconClass: 'text-accent' },
  note: { icon: Info, label: 'Note', className: 'border-border-strong bg-surface-raised/60', iconClass: 'text-fg-subtle' },
  warning: { icon: AlertTriangle, label: 'Watch out', className: 'border-warning/40 bg-warning-muted/25', iconClass: 'text-warning' },
  forward: { icon: ArrowRight, label: 'Coming up', className: 'border-accent/30 bg-surface-raised/50', iconClass: 'text-accent' },
} as const

export type CalloutKind = keyof typeof CALLOUT_KINDS

export function Callout({ kind = 'note', title, children }: { kind?: CalloutKind; title?: string; children: ReactNode }) {
  const config = CALLOUT_KINDS[kind] ?? CALLOUT_KINDS.note
  const Icon = config.icon
  return (
    <aside className={cn('my-6 rounded-panel border px-4 py-3.5', config.className)}>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-fg">
        <Icon className={cn('size-3.5', config.iconClass)} aria-hidden />
        {title ?? config.label}
      </p>
      <div className="text-sm leading-relaxed text-fg-muted [&>*+*]:mt-2">{children}</div>
    </aside>
  )
}

/** A plain comparison table — case endings, verb conjugations, word-order contrasts. */
export function Compare({ columns, rows, caption }: { columns: string[]; rows: string[][]; caption?: string }) {
  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border">
      <div className="pane-scroll overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-raised">
              {columns.map((col) => (
                <th key={col} scope="col" className="border-b border-border px-3.5 py-2.5 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
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
                      'word-display border-b border-border px-3.5 py-2.5 align-top',
                      j === 0 ? 'font-medium text-fg' : 'text-fg-muted',
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {cell}
                      {containsCyrillic(cell) && <SpeakButton text={cell} />}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <figcaption className="bg-surface/60 px-3.5 py-2 text-sm text-fg-subtle">{caption}</figcaption>}
    </figure>
  )
}

/**
 * One word or phrase, front and center: large Cyrillic, a stress-marked reading, and the English
 * meaning — the unit every lesson is actually built from.
 */
export function VocabCard({
  word,
  stressed,
  meaning,
  note,
}: {
  word: string
  /** The word with stress shown — usually just `markStress(word)`'s output, passed pre-rendered. */
  stressed: string
  meaning: string
  note?: string
}) {
  return (
    <div className="my-4 flex items-center gap-4 rounded-panel border border-border bg-surface px-4 py-3.5">
      <div className="flex shrink-0 items-center gap-1.5">
        <p className="word-display text-3xl text-fg">{word}</p>
        <SpeakButton text={word} />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm text-accent-strong">
          <Volume2 className="size-3.5 shrink-0 opacity-60" aria-hidden />
          {stressed}
        </p>
        <p className="mt-0.5 text-sm text-fg-muted">{meaning}</p>
        {note && <p className="mt-1 text-xs text-fg-subtle">{note}</p>}
      </div>
    </div>
  )
}

/** A short conversation, line by line, each with Cyrillic + a stress-marked reading + an English gloss. */
export function Dialogue({
  lines,
  caption,
}: {
  lines: { speaker: string; word: string; stressed: string; meaning: string }[]
  caption?: string
}) {
  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border bg-surface-sunken/40">
      {caption && (
        <figcaption className="border-b border-border bg-surface-raised/60 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
          {caption}
        </figcaption>
      )}
      <ol className="divide-y divide-border">
        {lines.map((line, i) => (
          <li key={i} className="px-4 py-3.5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{line.speaker}</p>
            <div className="flex items-center gap-1.5">
              <p className="word-display text-lg text-fg">{line.word}</p>
              <SpeakButton text={line.word} />
            </div>
            <p className="mt-0.5 text-sm text-accent-strong">{line.stressed}</p>
            <p className="mt-0.5 text-sm text-fg-muted">{line.meaning}</p>
          </li>
        ))}
      </ol>
    </figure>
  )
}

/**
 * A grammar pattern: the template, then the explanation in `children`.
 *
 * `speak` is a separate, optional override for the audio button: `pattern` is often an abstract
 * template ("Я / Ты / Он + verb ending") rather than a real, pronounceable word, and a
 * text-to-speech voice reads that badly or not at all. When `pattern` itself is a real Cyrillic
 * word or phrase, it doubles as the thing spoken and `speak` can be omitted.
 */
export function GrammarPoint({
  pattern,
  title,
  speak,
  children,
}: {
  pattern: string
  title?: string
  speak?: string
  children: ReactNode
}) {
  const spoken = speak ?? (containsCyrillic(pattern) ? pattern : undefined)
  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border">
      {title && (
        <figcaption className="border-b border-border bg-surface-raised/60 px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
          {title}
        </figcaption>
      )}
      <div className="flex items-center justify-center gap-1.5 bg-surface px-4 py-3">
        <p className="word-display rounded-lg bg-accent-muted/30 px-3 py-2 text-center text-lg font-medium text-accent-strong">
          {pattern}
        </p>
        {spoken && <SpeakButton text={spoken} />}
      </div>
      <div className="border-t border-border px-4 py-3.5 text-sm leading-relaxed text-fg-muted [&>*+*]:mt-2">
        {children}
      </div>
    </figure>
  )
}
