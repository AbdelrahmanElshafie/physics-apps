import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * KaTeX's fonts have no Arabic glyphs — an Arabic word inside `\text{...}` renders with a console
 * warning ("No character metrics for ...") and falls back to an unstyled system font mid-equation.
 * Found live: `N = 2.5 \times 10^{20}\ \text{إلكترون}` in the first lesson.
 *
 * The fix is always the same: say the unit in the surrounding Arabic prose or in the step's `why`
 * text, and keep everything inside `\text{}` — and every other LaTeX command — to symbols, digits
 * and Latin/English words. This test keeps that rule from regressing as more lessons are added.
 */

const CONTENT = path.join(process.cwd(), 'content', 'syllabi')
const ARABIC_IN_TEXT_CMD = /\\text\{[^}]*[؀-ۿ][^}]*\}/

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.yaml')) out.push(full)
  }
  return out
}

describe('LaTeX never carries Arabic text inside \\text{}', () => {
  const files = fs.existsSync(CONTENT) ? walk(CONTENT) : []
  expect(files.length).toBeGreaterThan(0)

  it.each(files)('%s', (file) => {
    const content = fs.readFileSync(file, 'utf8')
    const matches = [...content.matchAll(new RegExp(ARABIC_IN_TEXT_CMD, 'g'))].map((m) => m[0])
    expect(matches, `Found Arabic inside \\text{}: ${matches.join(', ')}`).toEqual([])
  })
})

/**
 * A second bidi trap, found live in the resistivity lesson: a `<Compare>` cell written as plain
 * text — `'≈ 1.7 × 10⁻⁸'` — rendered as `10⁻⁸ × 1.7 ≈`, fully
 * reversed. A short "×2" (double it) inside a Predict option, by contrast, renders fine —
 * confirmed live — because there is no run of digits *before* the × for the bidi algorithm to
 * fight over. The pattern that actually breaks is specifically scientific notation: a digit, then
 * ×, then "10" raised to a superscript exponent.
 *
 * The fix is the same shape as the \text{} rule: put it in `$...$` (or a raw LaTeX prop) so KaTeX's
 * `direction: ltr; unicode-bidi: isolate` rule applies, instead of leaving it as bare JSX-string
 * text.
 */
const SCI_NOTATION = /\d\s*×\s*10[⁰-ₜ]/ // e.g. "1.7 × 10⁻⁸"
const SINGLE_QUOTED_STRING = /'((?:[^'\\]|\\.)*)'/g

describe('scientific notation never appears as bare (un-mathed) text', () => {
  const files = fs.existsSync(CONTENT) ? walk(CONTENT) : []

  it.each(files)('%s', (file) => {
    const content = fs.readFileSync(file, 'utf8')
    const offenders: string[] = []
    for (const m of content.matchAll(SINGLE_QUOTED_STRING)) {
      const value = m[1]!
      if (SCI_NOTATION.test(value) && !value.trim().startsWith('$')) {
        offenders.push(value)
      }
    }
    expect(offenders, `Unwrapped scientific notation (wrap in $...$): ${offenders.join(', ')}`).toEqual([])
  })
})
