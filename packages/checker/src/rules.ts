import type { Check } from '@physics/core/domain'
import type { AnswerChecker, CheckOutcome } from '@physics/core/ports'

import {
  closeEnough,
  latexEquivalent,
  normaliseLatex,
  parseBoolean,
  parseMatrix,
  parseScalar,
  parseVector,
} from './latex'

const UNVERIFIED: CheckOutcome = { verdict: 'unverified' }

/** Renders the scale factor readably, so the feedback explains why a multiple was accepted. */
const fmtFactor = (factor: number): string =>
  Number.isInteger(factor) ? `${factor} times` : `${factor.toFixed(3)} times`
const correct = (detail?: string): CheckOutcome => ({
  verdict: 'correct',
  ...(detail !== undefined ? { detail } : {}),
})
const incorrect = (detail: string): CheckOutcome => ({ verdict: 'incorrect', detail })

/**
 * Rule-based answer checker.
 *
 * The contract from the port matters more than the rules: when this checker cannot parse an
 * answer it returns `unverified`, never `incorrect`. An unparseable answer is a limitation of the
 * checker, not a mistake by the learner, and marking it wrong would erode trust in every other
 * verdict. Those answers go to the tutor queue (or, for an app with no tutor bridge, simply stay
 * unverified for a human to review) instead.
 */
export class RulesAnswerChecker implements AnswerChecker {
  async check(check: Check, answer: string): Promise<CheckOutcome> {
    const raw = answer.trim()
    if (raw.length === 0) return UNVERIFIED

    switch (check.type) {
      case 'tutor':
        return UNVERIFIED

      case 'symbolic':
        // Out of scope by design: real symbolic equivalence needs a CAS. A SymPy-backed checker
        // implementing this same port can sit ahead of this one in a CompositeAnswerChecker.
        return UNVERIFIED

      case 'exact': {
        if (typeof check.value === 'boolean') {
          const parsed = parseBoolean(raw)
          if (parsed === null) return UNVERIFIED
          return parsed === check.value
            ? correct()
            : incorrect(`Expected ${check.value ? 'true' : 'false'}.`)
        }
        if (typeof check.value === 'number') {
          const parsed = parseScalar(raw)
          if (parsed === null) return UNVERIFIED
          return parsed === check.value ? correct() : incorrect(`Expected ${check.value}.`)
        }
        return normaliseLatex(raw).toLowerCase() === normaliseLatex(check.value).toLowerCase()
          ? correct()
          : incorrect('That is not the expected answer.')
      }

      case 'numeric': {
        const parsed = parseScalar(raw)
        if (parsed === null) return UNVERIFIED
        return closeEnough(parsed, check.value, check.tolerance)
          ? correct()
          : incorrect(`Expected ${check.value}.`)
      }

      case 'numeric-list': {
        const parsed = parseVector(raw)
        if (parsed === null) return UNVERIFIED
        if (parsed.length !== check.value.length) {
          return incorrect(
            `Expected ${check.value.length} component${check.value.length === 1 ? '' : 's'}, got ${parsed.length}.`,
          )
        }
        const wrongAt = parsed.findIndex(
          (v, i) => !closeEnough(v, check.value[i]!, check.tolerance),
        )
        return wrongAt === -1
          ? correct()
          : incorrect(`Component ${wrongAt + 1} should be ${check.value[wrongAt]}.`)
      }

      case 'numeric-matrix': {
        const parsed = parseMatrix(raw)
        if (parsed === null) return UNVERIFIED

        const expectedRows = check.value.length
        const expectedCols = check.value[0]?.length ?? 0
        if (parsed.length !== expectedRows || (parsed[0]?.length ?? 0) !== expectedCols) {
          return incorrect(
            `Expected a ${expectedRows}x${expectedCols} result, got ${parsed.length}x${parsed[0]?.length ?? 0}.`,
          )
        }

        for (let r = 0; r < expectedRows; r += 1) {
          for (let c = 0; c < expectedCols; c += 1) {
            if (!closeEnough(parsed[r]![c]!, check.value[r]![c]!, check.tolerance)) {
              return incorrect(`Entry (${r + 1}, ${c + 1}) should be ${check.value[r]![c]}.`)
            }
          }
        }
        return correct()
      }

      case 'parallel': {
        const parsed = parseVector(raw)
        if (parsed === null) return UNVERIFIED

        if (parsed.length !== check.value.length) {
          return incorrect(
            `Expected ${check.value.length} component${check.value.length === 1 ? '' : 's'}, got ${parsed.length}.`,
          )
        }
        if (parsed.every((component) => component === 0)) {
          return incorrect('The zero vector does not count — it lies on every line at once.')
        }

        // Recover the scale factor from the first component that can carry one, then require
        // every other component to agree with it.
        const pivot = check.value.findIndex((component) => Math.abs(component) > 1e-12)
        if (pivot === -1) return UNVERIFIED

        const factor = parsed[pivot]! / check.value[pivot]!
        if (!Number.isFinite(factor) || factor === 0) {
          return incorrect('That is not a multiple of the expected direction.')
        }

        const matches = parsed.every((component, i) =>
          closeEnough(component, factor * check.value[i]!, check.tolerance),
        )
        return matches
          ? correct(Math.abs(factor - 1) > 1e-9 ? `Correct — that is ${fmtFactor(factor)} the reference vector, which is the same direction.` : undefined)
          : incorrect('That does not point along the expected direction.')
      }

      case 'latex-equivalent': {
        const candidates = [check.value, ...check.accept]
        return candidates.some((c) => latexEquivalent(raw, c))
          ? correct()
          : // Structural comparison is shallow, so a mismatch is inconclusive, not wrong.
            UNVERIFIED
      }
    }
  }
}
