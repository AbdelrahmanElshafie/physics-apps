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
    const match = ARABIC_IN_TEXT_CMD.exec(content)
    expect(match, `Found Arabic inside \\text{}: ${match?.[0]}`).toBeNull()
  })
})
