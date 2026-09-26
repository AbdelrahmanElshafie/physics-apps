import type { Check } from '../domain/exercise'

/**
 * Deterministic answer checking.
 *
 * The rules adapter handles numerics, vectors, matrices, booleans and normalised LaTeX — enough
 * for instant feedback on most of Module 1.1. A SymPy sidecar (M4) implements the same interface
 * to get real symbolic equivalence (`\frac{1}{2}` vs `0.5`, expanded vs factored forms).
 */

export type AutoVerdict = 'correct' | 'incorrect' | 'unverified'

export interface CheckOutcome {
  readonly verdict: AutoVerdict
  /** Short, learner-facing reason. Empty when `unverified`. */
  readonly detail?: string
}

export interface AnswerChecker {
  /** `unverified` means "this checker cannot judge it" — route to the tutor, never mark wrong. */
  check(check: Check, answer: string): Promise<CheckOutcome>
}
