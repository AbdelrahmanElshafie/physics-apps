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

/**
 * Everything below belongs to Topic 11.1's second lesson, *Failures of the Schrodinger equation*.
 * It quantifies the two specific things the non-relativistic Hamiltonian is missing: the p^4
 * kinetic-energy correction, and any dependence on j at all.
 */

/**
 * Non-relativistic (Schrodinger + Coulomb) hydrogenic binding energy in cm^-1: `-Z^2 Ry / n^2`.
 *
 * Negative and depends only on n — never on l or j. That second fact is the qualitative failure
 * of section 4: no fine-structure splitting can come out of an energy that does not know j exists.
 */
export function coulombBindingEnergy(Z: number, n: number): number {
  return -(Z * Z * RYDBERG_CM) / (n * n)
}

/**
 * Ratio of the first relativistic kinetic-energy correction, `p^4 / 8 m^3 c^2`, to the leading
 * non-relativistic kinetic energy, `p^2 / 2m`, for a bound electron with `v/c = Z alpha / n`.
 *
 * Works out to `(v/c)^2 / 4` — the term the binomial expansion of `E = mc^2 sqrt(1 + p^2/m^2c^2)`
 * drops when it is truncated at the Schrodinger equation's order. Negligible at hydrogen
 * (0.001%), a few per cent at Mo XXXVI: the same (Z alpha)^2 that set the scale of everything in
 * the first lesson, now showing up as a fraction of the kinetic energy itself.
 */
export function relativisticKineticCorrectionRatio(Z: number, n = 1): number {
  const beta = speedOverC(Z, n)
  return (beta * beta) / 4
}

/**
 * The Sommerfeld fine-structure factor `n/(j + 1/2) - 3/4`.
 *
 * Pure bookkeeping — how the j-dependent part of the exact hydrogenic energy varies with the
 * total angular momentum j at fixed n. It is what a Schrodinger calculation has no way to write
 * down, because j never appears in its Hamiltonian at all.
 */
export function sommerfeldTerm(n: number, j: number): number {
  return n / (j + 0.5) - 0.75
}

/**
 * First-order relativistic energy shift in cm^-1, `-(Z^4 alpha^2 Ry / n^4) * sommerfeldTerm(n, j)`.
 *
 * This is the term responsible for splitting states of the same n and l by j — stated here, not
 * derived, since deriving it is the job of a later lesson once the Dirac equation exists. Its
 * purpose in this one is narrower: showing the shape of what Schrodinger's equation is missing.
 * The 2p splitting it predicts, `sommerfeldFineStructureShift(Z, 2, 0.5) -
 * sommerfeldFineStructureShift(Z, 2, 1.5)`, is exactly `-fineStructure2p(Z)` — the same number
 * the first lesson quoted, now traced to where the Z^4 actually comes from.
 */
export function sommerfeldFineStructureShift(Z: number, n: number, j: number): number {
  return -((Math.pow(Z, 4) * ALPHA * ALPHA * RYDBERG_CM) / Math.pow(n, 4)) * sommerfeldTerm(n, j)
}
