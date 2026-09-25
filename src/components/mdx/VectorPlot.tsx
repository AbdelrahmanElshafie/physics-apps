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
  cross,
  fmt,
  isZero,
  pointFromEvent as pointFrom,
  snap,
  toSvg,
  type Point,
} from './plot-geometry'

/**
 * A draggable 2-D vector.
 *
 * This replaces the ASCII-art figures in the handbook. The point is not decoration: dependence is
 * a fact about *direction*, and you learn it far faster by dragging one arrow onto another's line
 * and watching the readout flip than by reading that `(2,6) = 2(1,3)`.
 *
 * Pointer events (not mouse events) so it works with a trackpad, a touchscreen and a stylus alike,
 * and arrow keys move the head for keyboard users.
 */



export function VectorPlot({
  initial = [3, 2],
  companion,
  caption,
  label = 'v',
  companionLabel = 'u',
}: {
  initial?: Point
  companion?: Point
  caption?: string
  label?: string
  companionLabel?: string
}) {
  const [primary, setPrimary] = useState<Point>(initial)
  const [secondary, setSecondary] = useState<Point | null>(companion ?? null)
  const [dragging, setDragging] = useState<'primary' | 'secondary' | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gradientId = useId()

  const pointFromEvent = useCallback(
    (event: { clientX: number; clientY: number }): Point | null => pointFrom(svgRef.current, event),
    [],
  )

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    const point = pointFromEvent(event)
    if (!point) return
    if (dragging === 'primary') setPrimary(point)
    else setSecondary(point)
  }

  const nudge = (which: 'primary' | 'secondary', dx: number, dy: number) => {
    const set = which === 'primary' ? setPrimary : setSecondary
    const current = which === 'primary' ? primary : secondary
    if (!current) return
    set([clamp(snap(current[0] + dx)), clamp(snap(current[1] + dy))])
  }

  const keyHandler = (which: 'primary' | 'secondary') => (event: React.KeyboardEvent) => {
    const move = arrowKeyDelta(event.key, event.shiftKey)
    if (!move) return
    event.preventDefault()
    nudge(which, move[0], move[1])
  }

  const length = Math.hypot(primary[0], primary[1])

  // Dependence test: are the two vectors parallel? The cross product vanishing is the
  // robust form of "is one a multiple of the other", and it handles zero vectors gracefully.
  const dependent = secondary
    ? Math.abs(cross(primary, secondary)) < 1e-9 || isZero(primary) || isZero(secondary)
    : null

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
          aria-label="Interactive vector plot. Use the draggable handles, or focus one and use the arrow keys."
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragging(null)}
          onPointerLeave={() => setDragging(null)}
        >
          <defs>
            <marker
              id={`arrow-${gradientId}`}
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
              id={`arrow2-${gradientId}`}
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

          {/* Unit grid */}
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

          {/* Axes */}
          <g stroke="var(--color-border-strong)" strokeWidth="1.5">
            <line x1={0} y1={CENTRE} x2={SIZE} y2={CENTRE} />
            <line x1={CENTRE} y1={0} x2={CENTRE} y2={SIZE} />
          </g>
          <text x={SIZE - 12} y={CENTRE - 8} fill="var(--color-fg-subtle)" fontSize="12">
            x
          </text>
          <text x={CENTRE + 8} y={14} fill="var(--color-fg-subtle)" fontSize="12">
            y
          </text>

          {/* The line the two vectors share when dependent — makes the concept visible. */}
          {secondary && dependent && !isZero(primary) && (
            <line
              x1={toSvg(-primary[0] * SPAN, -primary[1] * SPAN).cx}
              y1={toSvg(-primary[0] * SPAN, -primary[1] * SPAN).cy}
              x2={toSvg(primary[0] * SPAN, primary[1] * SPAN).cx}
              y2={toSvg(primary[0] * SPAN, primary[1] * SPAN).cy}
              stroke="var(--color-danger)"
              strokeWidth="1"
              strokeDasharray="5 4"
              opacity="0.65"
            />
          )}

          {/* Component guides for the primary vector */}
          <g stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.45">
            <line
              x1={CENTRE}
              y1={toSvg(0, primary[1]).cy}
              x2={toSvg(primary[0], primary[1]).cx}
              y2={toSvg(primary[0], primary[1]).cy}
            />
            <line
              x1={toSvg(primary[0], 0).cx}
              y1={CENTRE}
              x2={toSvg(primary[0], primary[1]).cx}
              y2={toSvg(primary[0], primary[1]).cy}
            />
          </g>

          {secondary && (
            <>
              <line
                x1={CENTRE}
                y1={CENTRE}
                x2={toSvg(secondary[0], secondary[1]).cx}
                y2={toSvg(secondary[0], secondary[1]).cy}
                stroke="var(--color-warning)"
                strokeWidth="2.5"
                markerEnd={`url(#arrow2-${gradientId})`}
              />
              <circle
                cx={toSvg(secondary[0], secondary[1]).cx}
                cy={toSvg(secondary[0], secondary[1]).cy}
                r="9"
                fill="var(--color-warning)"
                fillOpacity="0.2"
                stroke="var(--color-warning)"
                strokeWidth="2"
                tabIndex={0}
                role="slider"
                aria-label={`Vector ${companionLabel} head, at ${fmt(secondary[0])}, ${fmt(secondary[1])}`}
                aria-valuetext={`${fmt(secondary[0])}, ${fmt(secondary[1])}`}
                className="cursor-grab outline-offset-4"
                onPointerDown={(e) => {
                  e.currentTarget.releasePointerCapture(e.pointerId)
                  setDragging('secondary')
                }}
                onKeyDown={keyHandler('secondary')}
              />
            </>
          )}

          <line
            x1={CENTRE}
            y1={CENTRE}
            x2={toSvg(primary[0], primary[1]).cx}
            y2={toSvg(primary[0], primary[1]).cy}
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            markerEnd={`url(#arrow-${gradientId})`}
          />
          <circle
            cx={toSvg(primary[0], primary[1]).cx}
            cy={toSvg(primary[0], primary[1]).cy}
            r="9"
            fill="var(--color-accent)"
            fillOpacity="0.2"
            stroke="var(--color-accent)"
            strokeWidth="2"
            tabIndex={0}
            role="slider"
            aria-label={`Vector ${label} head, at ${fmt(primary[0])}, ${fmt(primary[1])}`}
            aria-valuetext={`${fmt(primary[0])}, ${fmt(primary[1])}`}
            className="cursor-grab outline-offset-4"
            onPointerDown={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId)
              setDragging('primary')
            }}
            onKeyDown={keyHandler('primary')}
          />
          <circle cx={CENTRE} cy={CENTRE} r="3" fill="var(--color-fg-subtle)" />
        </svg>

        <div className="min-w-0 flex-1 space-y-3 text-sm">
          <Readout
            name={label}
            point={primary}
            colour="text-accent"
            extra={`length ${length.toFixed(2)}`}
          />
          {secondary && (
            <Readout
              name={companionLabel}
              point={secondary}
              colour="text-warning"
              extra={`length ${Math.hypot(secondary[0], secondary[1]).toFixed(2)}`}
            />
          )}

          {dependent !== null && (
            <p
              className={cn(
                'rounded-lg border px-3 py-2 text-xs leading-relaxed',
                dependent
                  ? 'border-danger/40 bg-danger-muted/40 text-fg'
                  : 'border-success/40 bg-success-muted/40 text-fg',
              )}
            >
              {dependent ? (
                <>
                  <strong className="font-semibold">Linearly dependent.</strong> Both arrows lie on
                  the dashed line, so every combination of them stays on that line — they span a
                  line, not the plane.
                </>
              ) : (
                <>
                  <strong className="font-semibold">Linearly independent.</strong> They point in
                  genuinely different directions, so combinations of them reach every point in{' '}
                  <span className="font-mono">R²</span>. They form a basis.
                </>
              )}
            </p>
          )}

          <p className="text-xs text-fg-subtle">
            Drag a head, or focus it and use the arrow keys (hold Shift for whole steps).
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

function Readout({
  name,
  point,
  colour,
  extra,
}: {
  name: string
  point: Point
  colour: string
  extra: string
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={cn('font-mono font-semibold', colour)}>{name}</span>
      <span className="font-mono text-fg">
        ({fmt(point[0])}, {fmt(point[1])})
      </span>
      <span className="text-xs text-fg-subtle">{extra}</span>
    </div>
  )
}
