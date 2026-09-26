import { renderMath } from '@/lib/katex'

/**
 * Renders a LaTeX fragment to HTML.
 *
 * Exists so the LaTeX-mode live preview uses the *same* KaTeX configuration as the lessons —
 * identical macros, identical error handling. A second client-side KaTeX setup would drift, and
 * `\ket{\psi}` previewing differently from how it finally renders is exactly the kind of small
 * inconsistency that erodes trust in the editor.
 */
export async function POST(request: Request): Promise<Response> {
  let latex: unknown
  try {
    latex = (await request.json())?.latex
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof latex !== 'string') {
    return Response.json({ error: 'Expected { latex: string }.' }, { status: 400 })
  }
  // Generous but bounded: a genuine answer is never this long, and this caps the work per request.
  if (latex.length > 4000) {
    return Response.json({ error: 'Expression too long.' }, { status: 413 })
  }

  return Response.json({ html: renderMath(latex, { display: true }) })
}
