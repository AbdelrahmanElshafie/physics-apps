import { renderMath } from '@/lib/katex'
import { cn } from '@/lib/utils'

/** Inline math. A server component — the HTML ships with the page, visible on first paint. */
export function M({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn('inline-block align-baseline', className)}
      dangerouslySetInnerHTML={{ __html: renderMath(children, { display: false }) }}
    />
  )
}

/** Raw display math with no surrounding chrome — used inside components that add their own. */
export function DisplayMath({ latex, className }: { latex: string; className?: string }) {
  return (
    <div
      className={cn('pane-scroll', className)}
      dangerouslySetInnerHTML={{ __html: renderMath(latex, { display: true }) }}
    />
  )
}

/** Splits plain text on `$...$` and renders those segments as inline math. */
export function MixedText({ text }: { text: string }) {
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
