'use client'

import { EquationActions } from '@physics/math-ui'
import { useWorkspace } from '@/stores/workspace'

/**
 * Wires `@physics/math-ui`'s `EquationActions` to this app's workspace store.
 *
 * A separate client component rather than adding `'use client'` to `Eq.tsx` itself: `Eq` renders
 * `DisplayMath`, which is a server component precisely so the equation's HTML ships with the page
 * on first paint. Only the small interactive corner needs the browser.
 */
export function AskAboutEquation({
  latex,
  equationId,
  label,
  topicId,
}: {
  latex: string
  equationId: string
  label?: string
  topicId: string
}) {
  const askAbout = useWorkspace((s) => s.askAbout)

  return (
    <EquationActions
      latex={latex}
      equationId={equationId}
      {...(label !== undefined ? { label } : {})}
      onAskAbout={(context, prefill) => askAbout({ ...context, topicId }, prefill)}
    />
  )
}
