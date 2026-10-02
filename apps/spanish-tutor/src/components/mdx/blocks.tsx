import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight, Info, Lightbulb, Volume2 } from 'lucide-react'

import { SpeakButton } from '@/components/audio/SpeakButton'
import { cn } from '@/lib/utils'

/**
 * Lesson building blocks for a language course — vocab, dialogue, grammar, asides.
 *
 * Unlike the Chinese and Russian apps, nothing here guesses which text is in the target language:
 * Spanish and English share an alphabet, so there's no character range to test for. Where a
 * block mixes the two (a Compare table), the author says which columns are Spanish; where a
 * block is single-purpose (VocabCard, Dialogue), the Spanish field is known by position.
 */

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

/**
 * A plain comparison table — conjugations, gender agreement, word-order contrasts.
 *
 * `speakColumns` names the (zero-based) columns that contain Spanish and should get a listen
 * button; everything else is assumed to be English and gets none. Explicit on purpose — a
 * heuristic would miss "hola" and "libro" every time, which are exactly the words a beginner
 * most wants to hear.
 */
export function Compare({
  columns,
  rows,
  caption,
  speakColumns = [],
}: {
  columns: string[]
  rows: string[][]
  caption?: string
  speakColumns?: number[]
}) {
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
                      {speakColumns.includes(j) && cell.trim() !== '' && <SpeakButton text={cell} />}
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
 * One word or phrase, front and center: the Spanish, an optional pronunciation hint, and the
 * English meaning — the unit every lesson is actually built from.
 *
 * There is no separate "reading" line the way pinyin or stressed Cyrillic needed: Spanish spells
 * its pronunciation, accents included. `pronunciation` exists for the handful of cases where a
 * hint genuinely helps an English speaker — a silent h, a j that sounds like an English h, a ll —
 * and should be left out otherwise.
 */
export function VocabCard({
  word,
  meaning,
  pronunciation,
  note,
}: {
  word: string
  meaning: string
  pronunciation?: string
  note?: string
}) {
  return (
    <div className="my-4 flex items-center gap-4 rounded-panel border border-border bg-surface px-4 py-3.5">
      <div className="flex shrink-0 items-center gap-1.5">
        <p className="word-display text-3xl text-fg">{word}</p>
        <SpeakButton text={word} />
      </div>
      <div className="min-w-0">
        {pronunciation && (
          <p className="flex items-center gap-1.5 text-sm text-accent-strong">
            <Volume2 className="size-3.5 shrink-0 opacity-60" aria-hidden />
            {pronunciation}
          </p>
        )}
        <p className={cn('text-sm text-fg-muted', pronunciation && 'mt-0.5')}>{meaning}</p>
        {note && <p className="mt-1 text-xs text-fg-subtle">{note}</p>}
      </div>
    </div>
  )
}

/** A short conversation, line by line, each with the Spanish + an English gloss. */
export function Dialogue({
  lines,
  caption,
}: {
  lines: { speaker: string; text: string; meaning: string }[]
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
            {line.speaker && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{line.speaker}</p>
            )}
            <div className="flex items-center gap-1.5">
              <p className="word-display text-lg text-fg">{line.text}</p>
              <SpeakButton text={line.text} />
            </div>
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
 * The pattern is spoken aloud by default, because in this course it is usually a real Spanish
 * sentence (Yo soy estudiante.). Pass `speak` to substitute a pronounceable version when the
 * pattern is an abstract template ("subject + ser + noun"), or `speak={null}` to suppress the
 * button entirely for a pattern that has nothing worth hearing.
 */
export function GrammarPoint({
  pattern,
  title,
  speak,
  children,
}: {
  pattern: string
  title?: string
  speak?: string | null
  children: ReactNode
}) {
  const spoken = speak === null ? undefined : (speak ?? pattern)
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
