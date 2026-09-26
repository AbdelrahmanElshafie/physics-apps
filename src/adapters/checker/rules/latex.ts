/**
 * LaTeX normalisation and numeric extraction.
 *
 * Scope is deliberately limited to what can be decided *safely*: literals, fractions, vectors and
 * matrices. Anything beyond that — expanded versus factored forms, trig identities, symbolic
 * equality — returns null so the caller reports `unverified` and routes to the tutor. Guessing
 * here would mark correct work wrong, which is far worse than deferring.
 *
 * Real symbolic equivalence arrives in M4 via the SymPy sidecar, behind the same port.
 */

/** Cosmetic markup that never changes meaning. */
const COSMETIC: RegExp[] = [
  /\\left\b/g,
  /\\right\b/g,
  /\\!/g,
  /\\,/g,
  /\\;/g,
  /\\:/g,
  /\\quad\b/g,
  /\\qquad\b/g,
  /\\displaystyle\b/g,
  /\\mathrm\b/g,
  /\\text(?:rm|it|bf)?\b/g,
  // Escaped space: a backslash followed by an actual space character.
  /\\[ ]/g,
  // MathLive leaves this token where a palette template's slot has not been filled in. It carries
  // no mathematical content, so strip it and let the surrounding parse fail honestly, rather than
  // letting the token leak into a stored answer or a question sent to the tutor.
  /\\placeholder\{\}/g,
  /\\placeholder\b/g,
]

/** Wrappers whose braces carry no meaning for comparison, so that \mathbb{R} equals R. */
const UNWRAP = ['mathbb', 'mathbf', 'mathcal', 'mathscr', 'boldsymbol', 'operatorname']

export function normaliseLatex(input: string): string {
  let s = input.trim()

  // Strip math-mode delimiters the editor may include.
  s = s.replace(/^\$+/, '').replace(/\$+$/, '')
  s = s.replace(/^\\\((.*)\\\)$/s, '$1').replace(/^\\\[(.*)\\\]$/s, '$1')

  for (const pattern of COSMETIC) s = s.replace(pattern, '')

  for (const cmd of UNWRAP) {
    // Loop to handle nesting such as \mathbb{\mathbf{R}}. A fresh regex each pass avoids the
    // lastIndex statefulness that a shared /g/ regex would carry between .test() calls.
    let previous: string
    do {
      previous = s
      s = s.replace(new RegExp(`\\\\${cmd}\\s*\\{([^{}]*)\\}`, 'g'), '$1')
    } while (s !== previous)
  }

  // \dfrac and \tfrac are \frac for comparison purposes.
  s = s.replace(/\\[dt]frac/g, '\\frac')
  // Drop braces around a single character, but only after ^ or _, so that R^{5} becomes R^5
  // while \frac{1}{2} keeps the braces that tell its arguments apart.
  s = s.replace(/([\^_])\{(\w)\}/g, '$1$2')
  // Collapse whitespace entirely — LaTeX ignores it.
  s = s.replace(/\s+/g, '')

  return s
}

/** Case-insensitive structural comparison of two LaTeX strings. */
export function latexEquivalent(a: string, b: string): boolean {
  return normaliseLatex(a).toLowerCase() === normaliseLatex(b).toLowerCase()
}

/**
 * Parses a scalar: integers, decimals, signs, `\frac{a}{b}` and `a/b`.
 * Returns null for anything else — including roots and pi, which belong to M4.
 */
export function parseScalar(input: string): number | null {
  const s = normaliseLatex(input)
  if (s.length === 0) return null

  const frac = /^(-?)\\frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}$/.exec(s)
  if (frac) {
    const denominator = Number(frac[3])
    if (denominator === 0) return null
    const value = Number(frac[2]) / denominator
    if (!Number.isFinite(value)) return null
    return frac[1] === '-' ? -value : value
  }

  const ratio = /^(-?[\d.]+)\/(-?[\d.]+)$/.exec(s)
  if (ratio) {
    const denominator = Number(ratio[2])
    if (denominator === 0) return null
    const value = Number(ratio[1]) / denominator
    return Number.isFinite(value) ? value : null
  }

  if (!/^-?\d*\.?\d+$/.test(s)) return null
  const value = Number(s)
  return Number.isFinite(value) ? value : null
}

/** Strips one layer of enclosing delimiters, if the string is fully enclosed. */
function unwrapDelimiters(s: string): string {
  const pairs: [string, string][] = [
    ['(', ')'],
    ['[', ']'],
    ['\\{', '\\}'],
    ['{', '}'],
  ]
  for (const [open, close] of pairs) {
    if (s.startsWith(open) && s.endsWith(close) && s.length > open.length + close.length) {
      return s.slice(open.length, s.length - close.length)
    }
  }
  return s
}

const MATRIX_ENV = /\\begin\{[pbvB]?matrix\}([\s\S]*?)\\end\{[pbvB]?matrix\}/

/**
 * Parses a vector from `(3, 2)`, `3,2`, or a single-row/column matrix environment.
 *
 * Row and column vectors are treated as the same thing, because the handbook states outright that
 * `(3,2,1)` and its column form "mean the exact same vector" — rejecting one would be teaching a
 * distinction the lesson explicitly denies.
 */
export function parseVector(input: string): number[] | null {
  const s = normaliseLatex(input)

  const env = MATRIX_ENV.exec(s)
  if (env) {
    const rows = env[1]!.split('\\\\').filter((r) => r.trim().length > 0)
    // Genuinely two-dimensional: more than one row *and* more than one column.
    if (rows.length > 1 && rows.some((r) => r.includes('&'))) return null

    const values = rows.flatMap((r) => r.split('&')).map(parseScalar)
    return values.length > 0 && values.every((v): v is number => v !== null) ? values : null
  }

  const body = unwrapDelimiters(s)
  if (!body.includes(',')) return null

  const values = body.split(',').map(parseScalar)
  return values.every((v): v is number => v !== null) ? values : null
}

/** Parses a 2-D matrix from a `matrix`/`pmatrix`/`bmatrix` environment. */
export function parseMatrix(input: string): number[][] | null {
  const s = normaliseLatex(input)

  const env = MATRIX_ENV.exec(s)
  if (env) {
    const rows = env[1]!.split('\\\\').filter((r) => r.trim().length > 0)
    const parsed = rows.map((row) => row.split('&').map(parseScalar))

    if (!parsed.every((row) => row.every((v): v is number => v !== null))) return null
    const width = parsed[0]?.length ?? 0
    if (width === 0 || !parsed.every((row) => row.length === width)) return null

    return parsed as number[][]
  }

  // A lone vector is a single-column matrix, so a column answer still checks out.
  const vector = parseVector(s)
  return vector ? vector.map((v) => [v]) : null
}

const TRUE_WORDS = new Set(['true', 't', 'yes', 'y'])
const FALSE_WORDS = new Set(['false', 'f', 'no', 'n'])

export function parseBoolean(input: string): boolean | null {
  const s = normaliseLatex(input).toLowerCase()
  if (TRUE_WORDS.has(s)) return true
  if (FALSE_WORDS.has(s)) return false
  return null
}

export function closeEnough(a: number, b: number, tolerance: number): boolean {
  if (a === b) return true
  // Relative tolerance at large magnitudes, absolute near zero.
  const scale = Math.max(1, Math.abs(a), Math.abs(b))
  return Math.abs(a - b) <= Math.max(tolerance, tolerance * scale)
}
