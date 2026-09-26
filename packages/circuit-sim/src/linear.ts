/**
 * Solves `A x = z` by Gaussian elimination with partial pivoting.
 *
 * Educational circuits stay small — a few dozen unknowns at most — so a dependency-free O(n^3)
 * solver is the right trade: no numeric library to vet, and it is fast enough that "solve on every
 * drag" never feels laggy.
 *
 * Returns `null` for a singular matrix rather than throwing: in this package that means the
 * circuit as drawn has no unique solution (typically two ideal voltage sources of different value
 * forced onto the same pair of nodes) — a fact the caller needs to report to a student, not a bug.
 */
export function solveLinearSystem(A: number[][], z: number[]): number[] | null {
  const n = z.length
  if (n === 0) return []

  // Augmented matrix, worked on in place.
  const M = A.map((row, i) => [...row, z[i]!])

  for (let col = 0; col < n; col += 1) {
    // Partial pivot: the largest magnitude entry in this column, at or below the diagonal.
    let pivotRow = col
    let pivotMag = Math.abs(M[col]![col]!)
    for (let r = col + 1; r < n; r += 1) {
      const mag = Math.abs(M[r]![col]!)
      if (mag > pivotMag) {
        pivotMag = mag
        pivotRow = r
      }
    }
    if (pivotMag < 1e-12) return null // Singular (or numerically indistinguishable from it).

    if (pivotRow !== col) {
      const tmp = M[col]!
      M[col] = M[pivotRow]!
      M[pivotRow] = tmp
    }

    const pivot = M[col]![col]!
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue
      const factor = M[r]![col]! / pivot
      if (factor === 0) continue
      for (let c = col; c <= n; c += 1) {
        M[r]![c] = M[r]![c]! - factor * M[col]![c]!
      }
    }
  }

  return M.map((row, i) => row[n]! / row[i]!)
}
