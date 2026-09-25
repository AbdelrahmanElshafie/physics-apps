import katex from 'katex'

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
      // Dirac notation appears constantly in this syllabus; defining it once here keeps every
      // surface — lessons, exercises, the LaTeX preview — rendering it identically.
      macros: {
        '\\ket': '\\left\\lvert #1 \\right\\rangle',
        '\\bra': '\\left\\langle #1 \\right\\rvert',
        '\\braket': '\\left\\langle #1 \\middle\\vert #2 \\right\\rangle',
        '\\dd': '\\mathrm{d}',
        '\\Real': '\\mathbb{R}',
        '\\Complex': '\\mathbb{C}',
      },
    })
  } catch (error) {
    // With throwOnError disabled this rarely fires, but content must never take down a page.
    console.warn('[katex] Failed to render:', latex, error)
    return `<code>${latex.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code>`
  }
}
