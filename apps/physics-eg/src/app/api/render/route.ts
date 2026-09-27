import { renderMath } from '@/lib/katex'

/**
 * Renders a LaTeX fragment to HTML, for the scratchpad's LaTeX-mode live preview. Exists so that
 * preview uses the exact same KaTeX configuration the rest of the app renders with — a second,
 * separate client-side setup would drift.
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
  // Generous but bounded: a genuine derivation step is never this long.
  if (latex.length > 4000) {
    return Response.json({ error: 'Expression too long.' }, { status: 413 })
  }

  return Response.json({ html: renderMath(latex, { display: true }) })
}
