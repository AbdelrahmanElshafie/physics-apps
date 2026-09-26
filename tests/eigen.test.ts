import { describe, expect, it } from 'vitest'

import { cross, norm, type Point } from '@/components/mdx/plot-geometry'

/**
 * The eigen-detection maths from the EigenPlot widget, tested directly.
 *
 * The widget tells the learner "this is an eigenvector, with eigenvalue lambda". If that claim is
 * wrong the figure actively teaches the wrong thing, which is worse than having no figure — so the
 * geometry is worth pinning down even though it lives in a component.
 */

type Matrix = readonly [readonly [number, number], readonly [number, number]]

const apply = (m: Matrix, v: Point): Point => [
  m[0][0] * v[0] + m[0][1] * v[1],
  m[1][0] * v[0] + m[1][1] * v[1],
]

const isZero = (v: Point) => v[0] === 0 && v[1] === 0

/** Mirrors the widget: parallel within a tolerance that scales with the magnitudes. */
function detect(m: Matrix, v: Point): number | null {
  const av = apply(m, v)
  const guard = Math.max(1, norm(v) * norm(av))
  if (isZero(v) || Math.abs(cross(v, av)) >= 1e-6 * guard) return null
  return (av[0] * v[0] + av[1] * v[1]) / (v[0] ** 2 + v[1] ** 2)
}

const SIGMA_X: Matrix = [
  [0, 1],
  [1, 0],
]
const ROTATION: Matrix = [
  [0, -1],
  [1, 0],
]
const SYMMETRIC: Matrix = [
  [2, 1],
  [1, 2],
]

describe('eigenvector detection', () => {
  it('finds both eigendirections of the spin-flip operator', () => {
    expect(detect(SIGMA_X, [1, 1])).toBeCloseTo(1)
    expect(detect(SIGMA_X, [1, -1])).toBeCloseTo(-1)
  })

  it('reports the same eigenvalue for a rescaled eigenvector', () => {
    // An eigenvector is a direction: the length must not change the eigenvalue.
    expect(detect(SIGMA_X, [5, 5])).toBeCloseTo(1)
    expect(detect(SIGMA_X, [-2, -2])).toBeCloseTo(1)
  })

  it('rejects a direction that is merely close to an eigendirection', () => {
    expect(detect(SIGMA_X, [1, 1.5])).toBeNull()
    expect(detect(SIGMA_X, [3, 1])).toBeNull()
  })

  it('finds the eigenvalues of the matrix used in the exercises', () => {
    expect(detect(SYMMETRIC, [1, 1])).toBeCloseTo(3)
    expect(detect(SYMMETRIC, [1, -1])).toBeCloseTo(1)
  })

  it('finds no real eigenvector for a rotation', () => {
    // A quarter turn preserves no direction, so every probe must come back null.
    for (const v of [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, -3],
      [-1, 4],
    ] as Point[]) {
      expect(detect(ROTATION, v)).toBeNull()
    }
  })

  it('treats the zero vector as not an eigenvector', () => {
    // Algebraically the equation holds for any lambda, which makes it meaningless to report one.
    expect(detect(SIGMA_X, [0, 0])).toBeNull()
  })

  it('agrees with trace and determinant', () => {
    const [a, b] = [detect(SYMMETRIC, [1, 1])!, detect(SYMMETRIC, [1, -1])!]
    const trace = SYMMETRIC[0][0] + SYMMETRIC[1][1]
    const determinant = SYMMETRIC[0][0] * SYMMETRIC[1][1] - SYMMETRIC[0][1] * SYMMETRIC[1][0]

    expect(a + b).toBeCloseTo(trace)
    expect(a * b).toBeCloseTo(determinant)
  })
})
