'use client'

import { useId, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import {
  CENTRE,
  SCALE,
  SIZE,
  SPAN,
  arrowKeyDelta,
  clamp,
  cross,
  fmt,
  isZero,
  norm,
  pointFromEvent,
  snap,
  toSvg,
  type Point,
} from './plot-geometry'

/**
 * Drag a vector and watch where an operator sends it.
 *
 * "An eigenvector is a direction the operator only rescales" is a sentence that slides past the
 * eye. Dragging until the two arrows snap into line, and seeing the readout report the eigenvalue,
 * does not. The true eigendirections are drawn as faint guides so the search has somewhere to land
 * rather than being a hunt in the dark.
 */

type Matrix = readonly [readonly [number, number], readonly [number, number]]

const apply = (m: Matrix, v: Point): Point => [
  m[0][0] * v[0] + m[0][1] * v[1],
  m[1][0] * v[0] + m[1][1] * v[1],
]

/**
 * Real eigendirections of a 2x2 matrix, or null when the eigenvalues are complex.
 * Complex eigenvalues mean the map rotates every direction — there is nothing to draw, and saying
 * so is more honest than drawing a guide that does not exist.
 */
function eigenDirections(m: Matrix): { value: number; direction: Point }[] | null {
  const [[a, b], [c, d]] = m
  const discriminant = (a - d) ** 2 + 4 * b * c
  if (discriminant < 0) return null

  const root = Math.sqrt(discriminant)
  const values = [((a + d) + root) / 2, ((a + d) - root) / 2]

  return values.map((value) => {
    // Solve (a - value)x + b y = 0, falling back when b vanishes.
    let direction: Point
    if (Math.abs(b) > 1e-9) direction = [b, value - a]
    else if (Math.abs(c) > 1e-9) direction = [value - d, c]
    else direction = Math.abs(value - a) < 1e-9 ? [1, 0] : [0, 1]

    const length = norm(direction) || 1
    return { value, direction: [direction[0] / length, direction[1] / length] as Point }
  })
}

export function EigenPlot({
  matrix = [
    [0, 1],
    [1, 0],
  ],
  initial = [3, 1],
  label = 'A',
  caption,
}: {
  matrix?: Matrix
  initial?: Point
  label?: string
  caption?: string
}) {
  const [v, setV] = useState<Point>(initial)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const uid = useId()

  const av = apply(matrix, v)
  const eigen = eigenDirections(matrix)

  // Parallel means the operator only rescaled it. Compare against the magnitudes so the tolerance
  // does not silently tighten for short vectors.
  const scaleGuard = Math.max(1, norm(v) * norm(av))
  const isEigenvector = !isZero(v) && Math.abs(cross(v, av)) < 1e-6 * scaleGuard
  const eigenvalue = isEigenvector && !isZero(v) ? (av[0] * v[0] + av[1] * v[1]) / (v[0] ** 2 + v[1] ** 2) : null

  const handleKey = (event: React.KeyboardEvent) => {
    const delta = arrowKeyDelta(event.key, event.shiftKey)
    if (!delta) return
    event.preventDefault()
    setV([clamp(snap(v[0] + delta[0])), clamp(snap(v[1] + delta[1]))])
  }

  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border bg-surface-sunken/50">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={cn(
            'w-full max-w-[320px] shrink-0 touch-none select-none rounded-lg bg-canvas',
            dragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          role="application"
          aria-label="Interactive eigenvector plot. Drag the arrowhead, or focus it and use the arrow keys."
          onPointerMove={(event) => {
            if (!dragging) return
            const point = pointFromEvent(svgRef.current, event)
            if (point) setV(point)
          }}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          <defs>
            <marker id={`ev-v-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent)" />
            </marker>
            <marker id={`ev-av-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-warning)" />
            </marker>
          </defs>

          <g stroke="var(--color-border)" strokeWidth="0.5" opacity="0.5">
            {Array.from({ length: SPAN * 2 + 1 }, (_, i) => {
              const at = i * SCALE
              return (
                <g key={i}>
                  <line x1={at} y1={0} x2={at} y2={SIZE} />
                  <line x1={0} y1={at} x2={SIZE} y2={at} />
                </g>
              )
            })}
          </g>

          <g stroke="var(--color-border-strong)" strokeWidth="1.5">
            <line x1={0} y1={CENTRE} x2={SIZE} y2={CENTRE} />
            <line x1={CENTRE} y1={0} x2={CENTRE} y2={SIZE} />
          </g>

          {/* Faint guides along the true eigendirections. */}
          {eigen?.map((e, i) => {
            const far: Point = [e.direction[0] * SPAN, e.direction[1] * SPAN]
            const a = toSvg(-far[0], -far[1])
            const b = toSvg(far[0], far[1])
            return (
              <line
                key={i}
                x1={a.cx}
                y1={a.cy}
                x2={b.cx}
                y2={b.cy}
                stroke="var(--color-success)"
                strokeWidth="1"
                strokeDasharray="4 5"
                opacity="0.4"
              />
            )
          })}

          <line
            x1={CENTRE}
            y1={CENTRE}
            x2={toSvg(av[0], av[1]).cx}
            y2={toSvg(av[0], av[1]).cy}
            stroke="var(--color-warning)"
            strokeWidth="2.5"
            markerEnd={`url(#ev-av-${uid})`}
          />
          <line
            x1={CENTRE}
            y1={CENTRE}
            x2={toSvg(v[0], v[1]).cx}
            y2={toSvg(v[0], v[1]).cy}
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            markerEnd={`url(#ev-v-${uid})`}
          />

          <circle
            cx={toSvg(v[0], v[1]).cx}
            cy={toSvg(v[0], v[1]).cy}
            r="9"
            fill="var(--color-accent)"
            fillOpacity="0.2"
            stroke="var(--color-accent)"
            strokeWidth="2"
            tabIndex={0}
            role="slider"
            aria-label={`Vector head, at ${fmt(v[0])}, ${fmt(v[1])}`}
            aria-valuetext={`${fmt(v[0])}, ${fmt(v[1])}${isEigenvector ? `, an eigenvector with eigenvalue ${eigenvalue?.toFixed(2)}` : ''}`}
            className="cursor-grab outline-offset-4"
            onPointerDown={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId)
              setDragging(true)
            }}
            onKeyDown={handleKey}
          />
          <circle cx={CENTRE} cy={CENTRE} r="3" fill="var(--color-fg-subtle)" />
        </svg>

        <div className="min-w-0 flex-1 space-y-2.5 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono font-semibold text-accent">v</span>
            <span className="font-mono text-fg">
              ({fmt(v[0])}, {fmt(v[1])})
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono font-semibold text-warning">{label}v</span>
            <span className="font-mono text-fg">
              ({fmt(av[0])}, {fmt(av[1])})
            </span>
          </div>

          {isEigenvector && eigenvalue !== null ? (
            <p className="rounded-lg border border-success/40 bg-success-muted/40 px-3 py-2 text-xs leading-relaxed text-fg">
              <strong className="font-semibold">Eigenvector.</strong> The two arrows lie on one
              line, so the operator only rescaled it — by{' '}
              <span className="font-mono font-semibold">λ = {eigenvalue.toFixed(2)}</span>. Every
              other direction gets rotated as well as stretched.
            </p>
          ) : (
            <p className="rounded-lg border border-border bg-surface/40 px-3 py-2 text-xs leading-relaxed text-fg-muted">
              The arrows point different ways, so this direction is <em>not</em> preserved. Drag
              onto a dashed line to find one that is.
            </p>
          )}

          {eigen === null && (
            <p className="rounded-lg border border-warning/40 bg-warning-muted/25 px-3 py-2 text-xs leading-relaxed text-fg-muted">
              This matrix has complex eigenvalues — it rotates every direction, so there is no real
              eigenvector to find.
            </p>
          )}

          <p className="text-xs text-fg-subtle">
            Drag the blue head, or focus it and use the arrow keys.
          </p>
        </div>
      </div>

      {caption && (
        <figcaption className="border-t border-border bg-surface/60 px-4 py-2.5 text-xs leading-relaxed text-fg-subtle">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
