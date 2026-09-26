import { DisplayMath } from './Math'

/**
 * A referenceable display equation.
 *
 * LaTeX arrives as a prop, not as MDX children — MDX parses element children as markdown, which
 * eats backslashes. Authors write `latex={String.raw\`...\`}`, a real JS expression, so the string
 * reaches KaTeX byte for byte.
 */
export function Eq({
  latex,
  id,
  label,
  number,
}: {
  latex: string
  id: string
  label?: string
  number?: string
}) {
  return (
    <figure id={`eq-${id}`} className="my-6 scroll-mt-24 rounded-panel border border-border bg-surface-sunken/60 py-4 px-5">
      <DisplayMath latex={latex} />
      {(label || number) && (
        <figcaption className="mt-2.5 flex items-baseline gap-2 text-xs">
          {number && <span className="font-mono text-fg-subtle">({number})</span>}
          {label && <span className="text-fg-subtle">{label}</span>}
        </figcaption>
      )}
    </figure>
  )
}
