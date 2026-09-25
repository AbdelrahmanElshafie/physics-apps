import { renderMath } from '@/lib/katex'
import { cn } from '@/lib/utils'

/**
 * Inline math. A server component — the HTML ships with the page, so equations are visible in the
 * first paint and readable without JavaScript.
 */
export function M({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn('inline-block align-baseline', className)}
      // KaTeX output is generated from lesson content we author; not user input.
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
