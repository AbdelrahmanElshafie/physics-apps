import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'

import type { GlossaryEntry } from '@core/domain'
import { Eq } from '@/components/math/Eq'
import { M } from '@/components/math/Math'
import { renderMath } from '@/lib/katex'

import { Axioms, Callout, Compare, Definition, Derivation, Step } from './blocks'
import { SymbolTooltip } from './SymbolTooltip'
import { VectorPlot } from './VectorPlot'

/**
 * The component vocabulary available to lesson authors.
 *
 * Built as a factory rather than a constant because components need the current topic (so a
 * question knows what it is about) and the syllabus glossary (so `<Symbol>` can resolve a term).
 * Passing those through props from the MDX would push bookkeeping into the content, which is
 * exactly where it does not belong.
 *
 * Widgets are looked up by name here, so a future syllabus can register its own — a
 * `<PotentialWell>` for scattering, say — without touching the renderer.
 */
export function mdxComponents(options: {
  topicId: string
  glossary: readonly GlossaryEntry[]
}): MDXComponents {
  const { topicId, glossary } = options
  const byName = new Map(glossary.map((entry) => [entry.name, entry]))

  return {
    // ---- math -------------------------------------------------------------
    M: ({ children }: { children: string }) => <M>{children}</M>,

    Eq: ({ latex, id, label, number }: { latex: string; id: string; label?: string; number?: string }) => (
      <Eq
        latex={latex}
        id={id}
        topicId={topicId}
        {...(label !== undefined ? { label } : {})}
        {...(number !== undefined ? { number } : {})}
      />
    ),

    // ---- structure --------------------------------------------------------
    Callout,
    Compare,
    Axioms,
    Derivation,
    Step,
    Definition,

    // ---- widgets ----------------------------------------------------------
    VectorPlot,

    // ---- glossary ---------------------------------------------------------
    Symbol: ({ name, children }: { name: string; children: ReactNode }) => {
      const entry = byName.get(name)
      // An unknown name renders as plain text: a missing glossary entry should never break a lesson.
      if (!entry) return <>{children}</>

      return (
        <SymbolTooltip
          term={entry.term}
          meaning={entry.meaning}
          mathHtml={renderMath(entry.latex, { display: false })}
        >
          {children}
        </SymbolTooltip>
      )
    },

    // ---- markdown element overrides ---------------------------------------
    // Tables authored as plain markdown still need to look like the rest of the app.
    table: ({ children }: { children?: ReactNode }) => (
      <div className="pane-scroll my-6 overflow-x-auto rounded-panel border border-border">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }: { children?: ReactNode }) => (
      <th className="border-b border-border bg-surface-raised px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {children}
      </th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td className="border-b border-border px-3.5 py-2.5 align-top">{children}</td>
    ),
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote className="my-5 border-l-2 border-border-strong pl-4 text-fg-subtle italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-8 border-border" />,
  }
}
