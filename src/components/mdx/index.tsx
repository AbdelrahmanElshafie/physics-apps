import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'

import type { GlossaryEntry, Locale } from '@core/domain'
import { Eq } from '@/components/math/Eq'
import { M } from '@/components/math/Math'
import { translator } from '@/lib/i18n'
import { renderMath } from '@/lib/katex'

import { Axioms, Callout, Compare, Definition, Derivation, Step, type CalloutKind } from './blocks'
import { DiracRadial, type DiracRadialStrings } from './DiracRadial'
import { EigenPlot } from './EigenPlot'
import { Faded, type FadedStep, type FadedStrings } from './Faded'
import { InnerProductPlot } from './InnerProductPlot'
import { Predict, type PredictStrings } from './Predict'
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
  locale: Locale
}): MDXComponents {
  const { topicId, glossary, locale } = options
  const byName = new Map(glossary.map((entry) => [entry.name, entry]))
  const t = translator(locale)

  // Widget chrome is resolved here, not inside the widgets, because this factory is the last
  // server-side point that knows the page's locale — including a per-page `?lang=` override that
  // the client store does not see. Finished strings also cross the client boundary; a translate
  // function would not.
  const calloutLabels: Record<CalloutKind, string> = {
    why: t('callout.why'),
    note: t('callout.note'),
    warning: t('callout.warning'),
    forward: t('callout.forward'),
  }

  const predictStrings: PredictStrings = {
    label: t('predict.label'),
    right: t('predict.right'),
    wrong: t('predict.wrong'),
  }

  const fadedStrings: FadedStrings = {
    label: t('faded.label'),
    supportLevel: t('faded.supportLevel'),
    reveal: t('faded.reveal'),
    stages: [
      { label: t('faded.worked'), hint: t('faded.workedHint') },
      { label: t('faded.faded'), hint: t('faded.fadedHint') },
      { label: t('faded.alone'), hint: t('faded.aloneHint') },
    ],
  }

  const diracStrings: DiracRadialStrings = {
    charge: t('dirac.charge'),
    chargeLabel: t('dirac.chargeLabel'),
    alt: t('dirac.alt'),
    negligible: t('dirac.negligible'),
    noticeable: t('dirac.noticeable'),
    large: t('dirac.large'),
    keyLarge: t('dirac.keyLarge'),
    keySmall: t('dirac.keySmall'),
    keyClassical: t('dirac.keyClassical'),
    marks: { 40: t('dirac.mark2020'), 42: t('dirac.mark2021'), 74: t('dirac.markTungsten') },
  }

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
    // An untitled callout takes its heading from the dictionary rather than from the component's
    // English default, so the heading follows the lesson's language.
    Callout: ({
      kind = 'note',
      title,
      children,
    }: {
      kind?: CalloutKind
      title?: string
      children: ReactNode
    }) => (
      <Callout kind={kind} title={title ?? calloutLabels[kind]}>
        {children}
      </Callout>
    ),
    Compare,
    Axioms,
    Derivation,
    Step,
    Definition,

    // ---- teaching methods -------------------------------------------------
    // Predict gates the explanation behind a committed guess; Faded walks a worked example out
    // from under the reader. Neither records anything — they are ways of reading, not assessment.
    Predict: (props: { question: string; options: string[]; answer: number; children: ReactNode }) => (
      <Predict {...props} strings={predictStrings} />
    ),
    Faded: (props: { caption?: string; steps: FadedStep[] }) => (
      <Faded {...props} strings={fadedStrings} />
    ),

    // ---- widgets ----------------------------------------------------------
    VectorPlot,
    InnerProductPlot,
    EigenPlot,
    DiracRadial: (props: { initialZ?: number; caption?: string }) => (
      <DiracRadial {...props} strings={diracStrings} />
    ),

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
