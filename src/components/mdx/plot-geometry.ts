/**
 * Shared coordinate maths for the interactive plot widgets.
 *
 * Extracted the moment a second widget needed it. Duplicating the SVG mapping is exactly how two
 * figures end up with subtly different grids and snapping, which looks like a rendering bug and
 * is miserable to track down.
 */

export const SPAN = 8 // Axis range: -SPAN..+SPAN
export const SIZE = 320 // Viewport size in SVG user units
export const CENTRE = SIZE / 2
export const SCALE = CENTRE / SPAN

export type Point = readonly [number, number]

export const toSvg = (x: number, y: number) => ({ cx: CENTRE + x * SCALE, cy: CENTRE - y * SCALE })

export const fromSvg = (cx: number, cy: number) => ({
  x: (cx - CENTRE) / SCALE,
  y: (CENTRE - cy) / SCALE,
})

export const clamp = (n: number) => Math.max(-SPAN, Math.min(SPAN, n))

/** Snap to halves — fine enough to feel continuous, coarse enough to read exact values. */
export const snap = (n: number) => Math.round(n * 2) / 2

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/**
 * Converts a pointer event to plot coordinates.
 * Goes through the rendered box rather than raw pixels, because the SVG scales with its container.
 */
export function pointFromEvent(
  svg: SVGSVGElement | null,
  event: { clientX: number; clientY: number },
): Point | null {
  if (!svg) return null

  const rect = svg.getBoundingClientRect()
  const cx = ((event.clientX - rect.left) / rect.width) * SIZE
  const cy = ((event.clientY - rect.top) / rect.height) * SIZE
  const { x, y } = fromSvg(cx, cy)

  return [clamp(snap(x)), clamp(snap(y))]
}

/** Arrow-key nudges, in plot units. Shift gives whole steps. */
export function arrowKeyDelta(key: string, shiftKey: boolean): Point | null {
  const step = shiftKey ? 1 : 0.5
  switch (key) {
    case 'ArrowLeft':
      return [-step, 0]
    case 'ArrowRight':
      return [step, 0]
    case 'ArrowUp':
      return [0, step]
    case 'ArrowDown':
      return [0, -step]
    default:
      return null
  }
}

export const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1]
export const norm = (a: Point) => Math.hypot(a[0], a[1])
/** Positive when b is counter-clockwise from a; zero when they are parallel. */
export const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0]
export const isZero = (a: Point) => a[0] === 0 && a[1] === 0
