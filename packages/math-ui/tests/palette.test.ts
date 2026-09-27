import katex from 'katex'
import { describe, expect, it } from 'vitest'

import { PALETTE, splitSource } from '../src/palette'

/**
 * Invariants for the equation palette.
 *
 * These exist because the palette failed silently once already: the templates used `#0`, which
 * MathLive does not recognise, so pressing the superscript button produced an empty base and an
 * empty exponent. Nothing threw, nothing logged — it simply looked broken. Every rule below turns
 * one class of that failure into a test failure instead.
 */

// A minimal local render, not this package's concern to export — just enough to catch a template
// that KaTeX itself rejects. No custom macros: every palette item uses standard KaTeX symbols.
function renderProbe(latex: string): string {
  return katex.renderToString(latex, { throwOnError: false, errorColor: '#f87171', strict: false })
}

describe('palette definitions', () => {
  it('has a unique id for every item', () => {
    const ids = PALETTE.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every item a label and a title', () => {
    for (const item of PALETTE) {
      expect(item.label.length, item.id).toBeGreaterThan(0)
      expect(item.title.length, item.id).toBeGreaterThan(0)
    }
  })

  it('defines both editors for every item', () => {
    // A button added to one editor and forgotten in the other is the bug this prevents.
    for (const item of PALETTE) {
      expect(item.mathlive.length, item.id).toBeGreaterThan(0)
      expect(item.source.length, item.id).toBeGreaterThan(0)
    }
  })

  it('uses only MathLive substitution tokens, never #0', () => {
    // #0 is macro-argument syntax, not an insert token. Using it is what broke the palette.
    for (const item of PALETTE) {
      expect(item.mathlive, `${item.id} must not use #0`).not.toMatch(/#\d/)

      for (const token of item.mathlive.match(/#./g) ?? []) {
        expect(['#@', '#?'], `${item.id} uses unknown token ${token}`).toContain(token)
      }
    }
  })

  it('makes every wrapping item consume what precedes the caret', () => {
    // A button that claims to wrap must actually reference the preceding item, or it will leave
    // an empty slot where the learner expected their own input.
    for (const item of PALETTE.filter((i) => i.wraps)) {
      expect(item.mathlive, `${item.id} claims to wrap`).toContain('#@')
    }
  })

  it('gives every wrapping item somewhere for the caret to land', () => {
    for (const item of PALETTE.filter((i) => i.wraps)) {
      expect(item.mathlive, `${item.id} needs a placeholder`).toContain('#?')
    }
  })

  it('marks the caret at most once in a source template', () => {
    for (const item of PALETTE) {
      const markers = item.source.split('|').length - 1
      expect(markers, `${item.id} has ${markers} caret markers`).toBeLessThanOrEqual(1)
    }
  })
})

describe('source templates render as valid LaTeX', () => {
  it('produces no KaTeX error for any item', () => {
    for (const item of PALETTE) {
      const { text } = splitSource(item.source)
      // A bare superscript or subscript needs a base to attach to before it is well formed.
      const probe = /^[\^_]/.test(text) ? `x${text}` : text
      const html = renderProbe(probe.replaceAll('{}', '{x}'))

      expect(html, `${item.id} -> ${probe}`).not.toContain('katex-error')
    }
  })
})

describe('splitSource', () => {
  it('removes the marker and reports its position', () => {
    expect(splitSource('\\sqrt{|}')).toEqual({ text: '\\sqrt{}', caret: 6 })
  })

  it('puts the caret at the end when there is no marker', () => {
    expect(splitSource('\\hbar')).toEqual({ text: '\\hbar', caret: 5 })
  })

  it('handles a marker at the very start', () => {
    expect(splitSource('|x')).toEqual({ text: 'x', caret: 0 })
  })

  it('leaves the text otherwise untouched', () => {
    for (const item of PALETTE) {
      const { text } = splitSource(item.source)
      expect(text).toBe(item.source.replace('|', ''))
    }
  })
})

describe('the superscript button specifically', () => {
  // This is the one the learner reported: type y, press x^n, expect to be typing the exponent.
  const sup = PALETTE.find((i) => i.id === 'sup')!

  it('wraps the preceding item rather than creating an empty base', () => {
    expect(sup.mathlive).toBe('#@^{#?}')
  })

  it('positions the caret inside the exponent in source mode', () => {
    const { text, caret } = splitSource(sup.source)
    expect(text).toBe('^{}')
    // Between the braces, so typing 2 after "y" gives y^{2}.
    expect(text.slice(0, caret)).toBe('^{')
  })
})
