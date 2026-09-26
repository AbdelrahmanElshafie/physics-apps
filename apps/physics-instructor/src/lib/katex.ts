import katex from 'katex'

/**
 * Macros shared by every surface that renders maths.
 *
 * Exported because prose (`$...$`, via rehype-katex) and the `<Eq>` component go through
 * different KaTeX entry points. Defining Dirac notation in only one of them would mean
 * `\ket{\psi}` rendering correctly in a lesson paragraph and failing three lines later inside a
 * component — so both read this one table.
 */
export const KATEX_MACROS: Record<string, string> = {
  '\\ket': '\\left\\lvert #1 \\right\\rangle',
  '\\bra': '\\left\\langle #1 \\right\\rvert',
  '\\braket': '\\left\\langle #1 \\middle\\vert #2 \\right\\rangle',
  // Matrix element: <phi|A|psi>.
  '\\braoket': '\\left\\langle #1 \\middle\\vert #2 \\middle\\vert #3 \\right\\rangle',
  '\\dd': '\\mathrm{d}',
  '\\Real': '\\mathbb{R}',
  '\\Complex': '\\mathbb{C}',
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
