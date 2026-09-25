'use client'

import { useCallback, useId, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import {
  CENTRE,
  SCALE,
  SIZE,
  SPAN,
  arrowKeyDelta,
  clamp,
  dot,
  fmt,
  isZero,
  norm,
  pointFromEvent,
  snap,
  toSvg,
  type Point,
} from './plot-geometry'

/**
 * Two draggable vectors showing their inner product, the angle between them, and the projection
 * of one onto the other.
 *
 * The inner product is the whole content of this lesson, and it is genuinely hard to feel from
 * the formula alone. Dragging until the readout hits zero and watching the projection collapse to
 * a point teaches "orthogonal means no overlap" in a way that a paragraph does not. The projection
 * is drawn because it *is* the coefficient you extract in an orthonormal expansion — the same
 * number, seen geometrically.
 */
export function InnerProductPlot({
  initialU = [4, 1],
  initialV = [2, 3],
  caption,
}: {
  initialU?: Point
  initialV?: Point
  caption?: string
}) {
  const [u, setU] = useState<Point>(initialU)
  const [v, setV] = useState<Point>(initialV)
  const [dragging, setDragging] = useState<'u' | 'v' | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const uid = useId()

  const move = useCallback((event: { clientX: number; clientY: number }) => {
    return pointFromEvent(svgRef.current, event)
  }, [])

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    const point = move(event)
    if (!point) return
    if (dragging === 'u') setU(point)
    else setV(point)
  }

  const keyHandler = (which: 'u' | 'v') => (event: React.KeyboardEvent) => {
    const delta = arrowKeyDelta(event.key, event.shiftKey)
    if (!delta) return
    event.preventDefault()
    const current = which === 'u' ? u : v
    const next: Point = [clamp(snap(current[0] + delta[0])), clamp(snap(current[1] + delta[1]))]
    if (which === 'u') setU(next)
    else setV(next)
  }

  const product = dot(u, v)
  const nu = norm(u)
  const nv = norm(v)
  const degenerate = isZero(u) || isZero(v)

  // cos(theta) is clamped because floating point can push it a hair outside [-1, 1].
  const cosTheta = degenerate ? 0 : Math.max(-1, Math.min(1, product / (nu * nv)))
  const angle = degenerate ? null : (Math.acos(cosTheta) * 180) / Math.PI
  const orthogonal = !degenerate && Math.abs(product) < 1e-9

  // Projection of v onto u: the component of v lying along u.
  const scale = degenerate ? 0 : product / (nu * nu)
  const projection: Point = [u[0] * scale, u[1] * scale]

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
          aria-label="Interactive inner product plot. Drag either arrowhead, or focus one and use the arrow keys."
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragging(null)}
          onPointerLeave={() => setDragging(null)}
        >
          <defs>
            <marker
              id={`ip-u-${uid}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent)" />
            </marker>
            <marker
              id={`ip-v-${uid}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
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

          {/* The projection of v onto u, plus the dropped perpendicular. */}
          {!degenerate && (
            <>
              <line
                x1={CENTRE}
                y1={CENTRE}
                x2={toSvg(projection[0], projection[1]).cx}
                y2={toSvg(projection[0], projection[1]).cy}
                stroke="var(--color-success)"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.55"
              />
              <line
                x1={toSvg(v[0], v[1]).cx}
                y1={toSvg(v[0], v[1]).cy}
                x2={toSvg(projection[0], projection[1]).cx}
                y2={toSvg(projection[0], projection[1]).cy}
                stroke="var(--color-fg-subtle)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.7"
              />
            </>
          )}

          <line
            x1={CENTRE}
            y1={CENTRE}
            x2={toSvg(u[0], u[1]).cx}
            y2={toSvg(u[0], u[1]).cy}
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            markerEnd={`url(#ip-u-${uid})`}
          />
          <line
            x1={CENTRE}
            y1={CENTRE}
            x2={toSvg(v[0], v[1]).cx}
            y2={toSvg(v[0], v[1]).cy}
            stroke="var(--color-warning)"
            strokeWidth="2.5"
            markerEnd={`url(#ip-v-${uid})`}
          />

          <Handle
            point={u}
            colour="var(--color-accent)"
            label="u"
            onDown={() => setDragging('u')}
            onKeyDown={keyHandler('u')}
          />
          <Handle
            point={v}
            colour="var(--color-warning)"
            label="v"
            onDown={() => setDragging('v')}
            onKeyDown={keyHandler('v')}
          />

          <circle cx={CENTRE} cy={CENTRE} r="3" fill="var(--color-fg-subtle)" />
        </svg>

        <div className="min-w-0 flex-1 space-y-2.5 text-sm">
          <Row label="u" colour="text-accent" value={`(${fmt(u[0])}, ${fmt(u[1])})`} extra={`‖u‖ = ${nu.toFixed(2)}`} />
          <Row label="v" colour="text-warning" value={`(${fmt(v[0])}, ${fmt(v[1])})`} extra={`‖v‖ = ${nv.toFixed(2)}`} />

          <div className="rounded-lg border border-border bg-surface/60 px-3 py-2 font-mono text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-fg-subtle">⟨u, v⟩</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  orthogonal ? 'text-success' : 'text-fg',
                )}
              >
                {fmt(product)}
              </span>
            </div>
            {angle !== null && (
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-fg-subtle">angle</span>
                <span className="tabular-nums text-fg-muted">{angle.toFixed(1)}°</span>
              </div>
            )}
          </div>

          {degenerate ? (
            <p className="rounded-lg border border-border bg-surface/40 px-3 py-2 text-xs leading-relaxed text-fg-subtle">
              One vector is zero. Its inner product with anything is zero, but that is bookkeeping
              rather than geometry — the zero vector has no direction to be orthogonal to.
            </p>
          ) : orthogonal ? (
            <p className="rounded-lg border border-success/40 bg-success-muted/40 px-3 py-2 text-xs leading-relaxed text-fg">
              <strong className="font-semibold">Orthogonal.</strong> The inner product is zero and
              the angle is 90°. The green projection has collapsed to nothing: <em>v</em> has no
              component along <em>u</em> at all. In quantum mechanics this is the statement that two
              states are perfectly distinguishable.
            </p>
          ) : (
            <p className="rounded-lg border border-border bg-surface/40 px-3 py-2 text-xs leading-relaxed text-fg-muted">
              The green bar is the projection of <em>v</em> onto <em>u</em> — how much of{' '}
              <em>v</em> points along <em>u</em>. That number is exactly the coefficient you extract
              when you expand a vector in a basis.
            </p>
          )}

          <p className="text-xs text-fg-subtle">
            Drag a head, or focus it and use the arrow keys. Try making the product zero.
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

function Handle({
  point,
  colour,
  label,
  onDown,
  onKeyDown,
}: {
  point: Point
  colour: string
  label: string
  onDown: () => void
  onKeyDown: (event: React.KeyboardEvent) => void
}) {
  const { cx, cy } = toSvg(point[0], point[1])
  return (
    <circle
      cx={cx}
      cy={cy}
      r="9"
      fill={colour}
      fillOpacity="0.2"
      stroke={colour}
      strokeWidth="2"
      tabIndex={0}
      role="slider"
      aria-label={`Vector ${label} head, at ${fmt(point[0])}, ${fmt(point[1])}`}
      aria-valuetext={`${fmt(point[0])}, ${fmt(point[1])}`}
      className="cursor-grab outline-offset-4"
      onPointerDown={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId)
        onDown()
      }}
      onKeyDown={onKeyDown}
    />
  )
}

function Row({
  label,
  colour,
  value,
  extra,
}: {
  label: string
  colour: string
  value: string
  extra: string
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={cn('font-mono font-semibold', colour)}>{label}</span>
      <span className="font-mono text-fg">{value}</span>
      <span className="font-mono text-xs text-fg-subtle">{extra}</span>
    </div>
  )
}
