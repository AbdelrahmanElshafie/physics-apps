/**
 * Closed-form relativistic atomic-structure results.
 *
 * These are the numbers Topic 11.1 argues from, and the same numbers `DiracRadial` plots and the
 * exercise answers are graded against. They live here, in core, so that all three read from one
 * definition and a test can check them — a lesson that quotes 15.7% while the widget draws 12%
 * would be worse than either one being wrong alone.
 *
 * Every function below is exact for a hydrogen-like ion with a point nucleus. That is a real
 * restriction: at Z alpha > 1 (around Z = 137) `diracExponent` goes imaginary and the point-nucleus
 * solution stops existing, which is why a finite nuclear model is the first thing GRASP asks for.
 */

/** Fine-structure constant, CODATA. */
export const ALPHA = 1 / 137.035999177

/** Rydberg constant in cm^-1. */
export const RYDBERG_CM = 109737.31568

/**
 * Speed of a bound electron as a fraction of c, from the Bohr estimate `v/c = Z alpha / n`.
 *
 * Crude in derivation and correct in scaling: the virial theorem gives the same result for the
 * root-mean-square speed in a proper treatment.
 */
export function speedOverC(Z: number, n = 1): number {
  return (Z * ALPHA) / n
}

/** Lorentz factor for that electron. */
export function lorentzFactor(Z: number, n = 1): number {
  const beta = speedOverC(Z, n)
  return 1 / Math.sqrt(1 - beta * beta)
}

/**
 * The Dirac radial exponent `gamma = sqrt(1 - (Z alpha)^2)` for kappa = -1.
 *
 * Both radial components go as `r^gamma` near the origin. Since gamma < 1 the relativistic
 * function rises more steeply there than the non-relativistic `r^1` — the contraction.
 *
 * Returns NaN past Z alpha = 1, rather than clamping: a silently-clamped value would draw a
 * plausible curve for a regime where the point-nucleus solution does not exist.
 */
export function diracExponent(Z: number, kappa = -1): number {
  const beta = Z * ALPHA
  return Math.sqrt(kappa * kappa - beta * beta)
}

/**
 * Magnitude of the small-to-large component ratio for the hydrogenic 1s state.
 *
 * Both components share the radial shape `r^gamma e^(-Zr)`, so this ratio is independent of r —
 * a single number that says how much of the wavefunction a non-relativistic method cannot
 * represent at all.
 */
export function smallOverLarge(Z: number): number {
  const gamma = diracExponent(Z)
  return Math.sqrt((1 - gamma) / (1 + gamma))
}

/**
 * Hydrogenic 2p fine-structure splitting in cm^-1: `Z^4 alpha^2 Ry / 16`.
 *
 * The Z^4 is the whole argument of the lesson. It carries the splitting from 0.37 cm^-1 in
 * hydrogen to over 10^6 cm^-1 in molybdenum, while binding energies grow only as Z^2.
 */
export function fineStructure2p(Z: number): number {
  return (Math.pow(Z, 4) * ALPHA * ALPHA * RYDBERG_CM) / 16
}
