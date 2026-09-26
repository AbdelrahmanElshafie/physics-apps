/**
 * The equation palette.
 *
 * Each button has to work in two different editors, which want different things:
 *
 *  - **MathLive** (`mathlive`) understands two substitution tokens, and using the right one is the
 *    whole difference between a button that works and one that does not:
 *      `#@`  the current selection, or failing that the item immediately before the caret
 *      `#?`  an empty placeholder slot; the caret jumps into the first one
 *    So a superscript is `#@^{#?}`: it takes what you just typed as the base and drops you in the
 *    exponent. Writing it the other way round produces an empty base and an empty exponent, which
 *    looks to the learner like the button did nothing.
 *
 *  - **The raw LaTeX textarea** (`source`) has no such machinery, so it carries plain text with a
 *    single `|` marking where the caret should land after insertion.
 *
 * Keeping both in one table means a button cannot be added to one editor and forgotten in the
 * other; `tests/palette.test.ts` enforces the invariants.
 */

export interface PaletteItem {
  readonly id: string
  /** What is drawn on the button. */
  readonly label: string
  /** Tooltip and accessible name. */
  readonly title: string
  /** MathLive insert template, using #@ and #? */
  readonly mathlive: string
  /** Plain LaTeX for the source editor; `|` marks the caret and is stripped on insertion. */
  readonly source: string
  /** True when the button wraps existing content rather than inserting standalone. */
  readonly wraps?: boolean
}

export const PALETTE: readonly PaletteItem[] = [
  {
    id: 'parens',
    label: '( )',
    title: 'Parentheses',
    mathlive: '\\left(#?\\right)',
    source: '\\left(|\\right)',
  },
  {
    id: 'matrix',
    label: '⎡ ⎤',
    title: 'Matrix / column vector',
    mathlive: '\\begin{pmatrix}#?\\end{pmatrix}',
    source: '\\begin{pmatrix}|\\end{pmatrix}',
  },
  {
    id: 'braket',
    label: '⟨ | ⟩',
    title: 'Inner product',
    mathlive: '\\langle #? \\vert #? \\rangle',
    source: '\\langle | \\vert  \\rangle',
  },
  {
    id: 'ket',
    label: '| ⟩',
    title: 'Ket',
    mathlive: '\\lvert #? \\rangle',
    source: '\\lvert | \\rangle',
  },
  {
    id: 'frac',
    label: 'a/b',
    title: 'Fraction',
    // Whatever precedes becomes the numerator, which is what you mean after typing "3".
    mathlive: '\\frac{#@}{#?}',
    source: '\\frac{|}{}',
    wraps: true,
  },
  {
    id: 'sqrt',
    label: '√',
    title: 'Square root',
    mathlive: '\\sqrt{#?}',
    source: '\\sqrt{|}',
  },
  {
    id: 'sup',
    label: 'xⁿ',
    title: 'Superscript',
    // The base is what you just typed; the caret lands in the exponent.
    mathlive: '#@^{#?}',
    source: '^{|}',
    wraps: true,
  },
  {
    id: 'sub',
    label: 'xₙ',
    title: 'Subscript',
    mathlive: '#@_{#?}',
    source: '_{|}',
    wraps: true,
  },
  {
    id: 'sum',
    label: '∑',
    title: 'Sum',
    mathlive: '\\sum_{#?}^{#?}',
    source: '\\sum_{|}^{}',
  },
  {
    id: 'int',
    label: '∫',
    title: 'Integral',
    mathlive: '\\int_{#?}^{#?}',
    source: '\\int_{|}^{}',
  },
  { id: 'hbar', label: 'ℏ', title: 'h-bar', mathlive: '\\hbar', source: '\\hbar|' },
  { id: 'psi', label: 'ψ', title: 'psi', mathlive: '\\psi', source: '\\psi|' },
  { id: 'phi', label: 'φ', title: 'phi', mathlive: '\\phi', source: '\\phi|' },
  { id: 'sigma', label: 'σ', title: 'sigma', mathlive: '\\sigma', source: '\\sigma|' },
  { id: 'gamma', label: 'Γ', title: 'Gamma', mathlive: '\\Gamma', source: '\\Gamma|' },
  { id: 'delta', label: 'δ', title: 'delta', mathlive: '\\delta', source: '\\delta|' },
  { id: 'lambda', label: 'λ', title: 'lambda', mathlive: '\\lambda', source: '\\lambda|' },
  {
    id: 'dagger',
    label: '†',
    title: 'Dagger',
    mathlive: '^\\dagger',
    source: '^\\dagger|',
  },
  { id: 'times', label: '×', title: 'Times', mathlive: '\\times', source: '\\times|' },
  { id: 'cdot', label: '·', title: 'Dot product', mathlive: '\\cdot', source: '\\cdot|' },
]

export const CARET = '|'

/**
 * Splits a `source` template into the text to insert and where to put the caret.
 * A template with no marker leaves the caret at the end.
 */
export function splitSource(source: string): { text: string; caret: number } {
  const at = source.indexOf(CARET)
  if (at === -1) return { text: source, caret: source.length }
  return { text: source.slice(0, at) + source.slice(at + 1), caret: at }
}
