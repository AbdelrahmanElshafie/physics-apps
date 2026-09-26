import { DisplayMath } from './Math'
import { EquationActions } from './EquationActions'

/**
 * A referenceable display equation.
 *
 * The LaTeX arrives as a prop rather than as children, because MDX parses element children as
 * markdown — which eats backslashes and turns `_` into emphasis. Authors write
 * `latex={String.raw`...`}`, a real JS expression, so the string reaches KaTeX byte for byte.
 * It also means the copy and "ask about this" actions get the exact source.
 *
 * Prose math uses `$...$` and `$$...$$` (remark-math) instead; this component is for equations
 * worth linking to and asking about.
 */
export function Eq({
  latex,
  id,
  label,
  topicId,
  number,
}: {
  latex: string
  id: string
  label?: string
  topicId: string
  number?: string
}) {
  return (
    <figure
      id={`eq-${id}`}
      // `group` drives the hover reveal of the action buttons.
      className="group relative my-6 scroll-mt-24 rounded-panel border border-border bg-surface-sunken/60 py-4 pl-5 pr-12"
    >
      <DisplayMath latex={latex} />

      {(label || number) && (
        <figcaption className="mt-2.5 flex items-baseline gap-2 text-xs">
          {number && <span className="font-mono text-fg-subtle">({number})</span>}
          {label && <span className="text-fg-subtle">{label}</span>}
        </figcaption>
      )}

      <EquationActions
        latex={latex}
        equationId={id}
        {...(label !== undefined ? { label } : {})}
        topicId={topicId}
      />
    </figure>
  )
}
