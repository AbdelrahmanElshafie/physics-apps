import katex from 'katex'

/**
 * Macros shared by every surface that renders maths.
 *
 * Exported because prose (`$...$`, via rehype-katex) and the `<Eq>` component go through
 * different KaTeX entry points — defining a macro in only one of them would mean it rendering
 * correctly in a lesson paragraph and failing three lines later inside a component.
 */
export const KATEX_MACROS: Record<string, string> = {
  '\\dd': '\\mathrm{d}',
  '\\Real': '\\mathbb{R}',
}

/**
 * Renders LaTeX to HTML on the server.
 *
 * Rendering here rather than in the browser means display math is present in the first paint —
 * no layout shift as a client bundle hydrates, and equations stay readable with JavaScript off.
 * `output: 'htmlAndMathml'` emits a MathML tree alongside the visual one, which is what screen
 * readers actually announce.
 */
export function renderMath(latex: string, options: { display?: boolean } = {}): string {
  try {
    return katex.renderToString(latex, {
      displayMode: options.display ?? false,
      throwOnError: false,
      // Malformed LaTeX shows in red rather than blanking the lesson — authoring feedback.
      errorColor: '#f87171',
      strict: false,
      trust: false,
      output: 'htmlAndMathml',
      macros: KATEX_MACROS,
    })
  } catch (error) {
    // With throwOnError disabled this rarely fires, but content must never take down a page.
    console.warn('[katex] Failed to render:', latex, error)
    return `<code>${latex.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code>`
  }
}
