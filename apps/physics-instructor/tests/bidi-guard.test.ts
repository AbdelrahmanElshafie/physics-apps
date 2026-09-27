import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Two bidi traps that have each cost a real, live bug in this project's Arabic content — one here,
 * one in physics-eg (same underlying cause, found independently). Both guards live in both apps
 * now that the second one surfaced the pattern; see apps/physics-eg's copy of this file for the
 * fuller account of what each one looked like rendered.
 *
 * 1. An Arabic word inside `\text{...}` — KaTeX has no Arabic glyphs for it, so it renders with a
 *    console warning and an unstyled fallback font mid-equation.
 * 2. Scientific notation (`1.67 × 10⁵`) written as bare Compare-cell text instead of `$...$` — the
 *    digit-times-superscript-exponent run is bidi-neutral enough that an RTL paragraph reorders it
 *    to `10⁵ × 1.67`. A short "×2" is not affected; the trigger is specifically "digit, ×, 10,
 *    superscript exponent" together, which is why this shipped for a while before a table needing
 *    real scientific notation surfaced it.
 */

const CONTENT = path.join(process.cwd(), 'content', 'syllabi')
const ARABIC_IN_TEXT_CMD = /\\text\{[^}]*[؀-ۿ][^}]*\}/
const SCI_NOTATION = /\d\s*×\s*10[⁰-ₜ]/ // e.g. "1.67 × 10⁵"
const SINGLE_QUOTED_STRING = /'((?:[^'\\]|\\.)*)'/g

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.yaml')) out.push(full)
  }
  return out
}

const files = fs.existsSync(CONTENT) ? walk(CONTENT) : []

describe('LaTeX never carries Arabic text inside \\text{}', () => {
  expect(files.length).toBeGreaterThan(0)

  it.each(files)('%s', (file) => {
    const content = fs.readFileSync(file, 'utf8')
    const matches = [...content.matchAll(new RegExp(ARABIC_IN_TEXT_CMD, 'g'))].map((m) => m[0])
    expect(matches, `Found Arabic inside \\text{}: ${matches.join(', ')}`).toEqual([])
  })
})

describe('scientific notation never appears as bare (un-mathed) text', () => {
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
