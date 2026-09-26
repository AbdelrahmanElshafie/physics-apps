import { describe, expect, it } from 'vitest'

import { RulesAnswerChecker } from '../src/rules'
import { normaliseLatex, parseMatrix, parseScalar, parseVector } from '../src/latex'
import type { Check } from '@physics/core/domain'

/**
 * The checker's most important property is not accuracy — it is refusing to guess.
 *
 * A wrong "incorrect" on a right answer destroys trust in every other verdict, so anything it
 * cannot parse must come back `unverified` and go to the tutor. Several tests below exist purely
 * to pin that behaviour down.
 */

const checker = new RulesAnswerChecker()
const verdict = async (check: Check, answer: string) => (await checker.check(check, answer)).verdict

describe('normaliseLatex', () => {
  it('strips cosmetic markup that never changes meaning', () => {
    expect(normaliseLatex('\\left( 3, 2 \\right)')).toBe('(3,2)')
  })

  it('unwraps blackboard bold so R^5 and \\mathbb{R}^5 compare equal', () => {
    expect(normaliseLatex('\\mathbb{R}^{5}')).toBe('R^5')
    expect(normaliseLatex('R^5')).toBe('R^5')
  })

  it('removes math-mode delimiters', () => {
    expect(normaliseLatex('$x+1$')).toBe('x+1')
  })

  it('strips the placeholder token a palette template leaves behind', () => {
    // MathLive emits \placeholder{} for an unfilled slot; it carries no mathematical content.
    expect(normaliseLatex(String.raw`\left(\placeholder{}\right)`)).toBe('()')
    expect(normaliseLatex(String.raw`\left(6,2\right)`)).toBe('(6,2)')
  })
})

describe('parseScalar', () => {
  it('reads integers, decimals and signs', () => {
    expect(parseScalar('6')).toBe(6)
    expect(parseScalar('-3.5')).toBe(-3.5)
  })

  it('reads fractions in both spellings', () => {
    expect(parseScalar('\\frac{1}{2}')).toBe(0.5)
    expect(parseScalar('1/2')).toBe(0.5)
  })

  it('refuses division by zero rather than returning Infinity', () => {
    expect(parseScalar('\\frac{1}{0}')).toBeNull()
  })

  it('returns null for symbolic input it cannot evaluate', () => {
    expect(parseScalar('\\sqrt{10}')).toBeNull()
    expect(parseScalar('\\pi')).toBeNull()
  })
})

describe('parseVector', () => {
  it('reads parenthesised and bare comma lists', () => {
    expect(parseVector('(6, 2)')).toEqual([6, 2])
    expect(parseVector('6,2')).toEqual([6, 2])
  })

  it('treats a column vector as the same thing as a row', () => {
    expect(parseVector('\\begin{pmatrix}6\\\\2\\end{pmatrix}')).toEqual([6, 2])
  })

  it('returns null for a genuine 2-D matrix', () => {
    expect(parseVector('\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}')).toBeNull()
  })
})

describe('parseMatrix', () => {
  it('reads a 2x2 matrix', () => {
    expect(parseMatrix('\\begin{pmatrix}1&2\\\\3&0\\end{pmatrix}')).toEqual([
      [1, 2],
      [3, 0],
    ])
  })

  it('accepts a column vector as a single-column matrix', () => {
    expect(parseMatrix('(6, 12)')).toEqual([[6], [12]])
  })

  it('rejects ragged rows', () => {
    expect(parseMatrix('\\begin{pmatrix}1&2\\\\3\\end{pmatrix}')).toBeNull()
  })
})

describe('RulesAnswerChecker', () => {
  it('checks Q4 — the vector 2(3,1) = (6,2)', async () => {
    const check: Check = { type: 'numeric-list', value: [6, 2], tolerance: 1e-9 }
    expect(await verdict(check, '(6, 2)')).toBe('correct')
    expect(await verdict(check, '\\begin{pmatrix}6\\\\2\\end{pmatrix}')).toBe('correct')
    expect(await verdict(check, '(6, 3)')).toBe('incorrect')
  })

  it('names which component is wrong', async () => {
    const outcome = await checker.check({ type: 'numeric-list', value: [8, 5], tolerance: 0 }, '(8, 4)')
    expect(outcome.verdict).toBe('incorrect')
    expect(outcome.detail).toMatch(/Component 2 should be 5/)
  })

  it('checks Q17 — the matrix product (6, 12)', async () => {
    const check: Check = { type: 'numeric-matrix', value: [[6], [12]], tolerance: 1e-9 }
    expect(await verdict(check, '\\begin{pmatrix}6\\\\12\\end{pmatrix}')).toBe('correct')
    expect(await verdict(check, '(6, 12)')).toBe('correct')
    expect(await verdict(check, '(6, 11)')).toBe('incorrect')
  })

  it('checks Q7a — a true/false answer', async () => {
    const check: Check = { type: 'exact', value: false }
    expect(await verdict(check, 'false')).toBe('correct')
    expect(await verdict(check, 'F')).toBe('correct')
    expect(await verdict(check, 'true')).toBe('incorrect')
  })

  it('checks Q16 — a plain number', async () => {
    expect(await verdict({ type: 'numeric', value: 3, tolerance: 0 }, '3')).toBe('correct')
    expect(await verdict({ type: 'numeric', value: 3, tolerance: 0 }, '4')).toBe('incorrect')
  })

  it('accepts alternative spellings for Q2', async () => {
    const check: Check = { type: 'latex-equivalent', value: '\\mathbb{R}^5', accept: ['R^5'] }
    expect(await verdict(check, 'R^5')).toBe('correct')
    expect(await verdict(check, '\\mathbb{R}^{5}')).toBe('correct')
  })

  it('applies tolerance to floating point comparisons', async () => {
    const check: Check = { type: 'numeric', value: 0.3, tolerance: 1e-9 }
    expect(await verdict(check, '0.30000000001')).toBe('correct')
  })

  // --- direction-only answers (eigenvectors) ---

  it('accepts any non-zero multiple for a parallel check', async () => {
    // An eigenvector is a direction, so (2,2) is as correct as (1,1). A question that invites
    // "any vector on that line" must not then accept only one of them.
    const check: Check = { type: 'parallel', value: [1, 1], tolerance: 1e-9 }
    expect(await verdict(check, '(1, 1)')).toBe('correct')
    expect(await verdict(check, '(2, 2)')).toBe('correct')
    expect(await verdict(check, '(-3, -3)')).toBe('correct')
    expect(await verdict(check, '(0.5, 0.5)')).toBe('correct')
  })

  it('explains the scale factor when a multiple is accepted', async () => {
    const outcome = await checker.check({ type: 'parallel', value: [1, 1], tolerance: 1e-9 }, '(2, 2)')
    expect(outcome.detail).toMatch(/2 times/)
  })

  it('still rejects a different direction', async () => {
    const check: Check = { type: 'parallel', value: [1, 1], tolerance: 1e-9 }
    expect(await verdict(check, '(1, 2)')).toBe('incorrect')
    expect(await verdict(check, '(1, -1)')).toBe('incorrect')
  })

  it('rejects the zero vector, which lies on every line', async () => {
    const outcome = await checker.check({ type: 'parallel', value: [1, 1], tolerance: 1e-9 }, '(0, 0)')
    expect(outcome.verdict).toBe('incorrect')
    expect(outcome.detail).toMatch(/zero vector/)
  })

  it('rejects the wrong number of components', async () => {
    const check: Check = { type: 'parallel', value: [1, 1], tolerance: 1e-9 }
    expect(await verdict(check, '(1, 1, 1)')).toBe('incorrect')
  })

  it('handles a direction with a zero component', async () => {
    const check: Check = { type: 'parallel', value: [0, 1], tolerance: 1e-9 }
    expect(await verdict(check, '(0, 5)')).toBe('correct')
    expect(await verdict(check, '(1, 5)')).toBe('incorrect')
  })

  // --- the refusal-to-guess contract ---

  it('returns unverified, never incorrect, for an answer it cannot parse', async () => {
    expect(await verdict({ type: 'numeric', value: 3, tolerance: 0 }, '\\sqrt{9}')).toBe('unverified')
    expect(await verdict({ type: 'numeric-list', value: [1, 2], tolerance: 0 }, 'the x-axis')).toBe(
      'unverified',
    )
  })

  it('returns unverified for a tutor-graded check', async () => {
    expect(await verdict({ type: 'tutor' }, 'anything at all')).toBe('unverified')
  })

  it('does not mark a half-filled template wrong', async () => {
    // Submitting a template with an empty slot is incomplete, not incorrect.
    const check: Check = { type: 'numeric-list', value: [6, 2], tolerance: 0 }
    expect(await verdict(check, String.raw`\left(6,\placeholder{}\right)`)).toBe('unverified')
  })

  it('accepts an answer typed into a palette template', async () => {
    const check: Check = { type: 'numeric-list', value: [6, 2], tolerance: 0 }
    expect(await verdict(check, String.raw`\left(6,2\right)`)).toBe('correct')
  })

  it('returns unverified for a blank answer rather than marking it wrong', async () => {
    expect(await verdict({ type: 'numeric', value: 3, tolerance: 0 }, '   ')).toBe('unverified')
  })

  it('returns unverified when latex comparison fails, since the match is only structural', async () => {
    const check: Check = { type: 'latex-equivalent', value: '\\mathbb{R}^5', accept: [] }
    expect(await verdict(check, '\\mathbb{R}^{6}')).toBe('unverified')
  })
})
