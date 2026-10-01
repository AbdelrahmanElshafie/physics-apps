import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'

import { Callout, Compare, Dialogue, GrammarPoint, VocabCard } from './blocks'
import { Predict } from './Predict'
import { ToneDemo } from './ToneDemo'

/** The component vocabulary available to lesson authors. */
export function mdxComponents(): MDXComponents {
  return {
    Callout,
    Compare,
    VocabCard,
    Dialogue,
    GrammarPoint,
    Predict,
    ToneDemo,

    table: ({ children }: { children?: ReactNode }) => (
      <div className="pane-scroll my-6 overflow-x-auto rounded-panel border border-border">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }: { children?: ReactNode }) => (
      <th className="border-b border-border bg-surface-raised px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {children}
      </th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td className="hanzi-display border-b border-border px-3.5 py-2.5 align-top">{children}</td>
    ),
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote className="my-5 border-l-2 border-border-strong pl-4 text-fg-subtle italic">{children}</blockquote>
    ),
    hr: () => <hr className="my-8 border-border" />,
  }
}
