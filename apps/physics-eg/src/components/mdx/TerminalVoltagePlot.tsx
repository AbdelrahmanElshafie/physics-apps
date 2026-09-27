import { lineFromTwoPoints } from '@core/domain'

/**
 * A terminal-voltage-vs-current graph for a real cell: two measured (I, V) points, the straight
 * line through them, and its y-intercept (= emf) and slope (= -internal resistance) labelled
 * directly on the plot. `data-ltr` keeps the axes and numerals from being reordered inside RTL
 * prose — see globals.css's "Bidirectional text" section.
 */
export function TerminalVoltagePlot({
  points,
  caption,
  maxI,
  maxV,
}: {
  points: [{ i: number; v: number }, { i: number; v: number }]
  caption?: string
  maxI: number
  maxV: number
}) {
  const [p1, p2] = points
  const { slope, intercept } = lineFromTwoPoints(p1.i, p1.v, p2.i, p2.v)

  const width = 360
  const height = 240
  const pad = { left: 48, right: 20, top: 20, bottom: 40 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  const xOf = (i: number) => pad.left + (i / maxI) * plotW
  const yOf = (v: number) => pad.top + plotH - (v / maxV) * plotH

  const lineX2 = maxI
  const lineY0 = intercept
  const lineY2 = intercept + slope * lineX2

  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border bg-surface">
      <div className="flex justify-center px-4 pt-4">
        <svg data-ltr viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: 420 }} role="img" aria-label={caption ?? 'رسم بياني بين فرق الجهد الطرفي وشدة التيار'}>
          {/* Axes */}
          <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="var(--color-border-strong)" strokeWidth={1.5} />
          <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="var(--color-border-strong)" strokeWidth={1.5} />

          {/* Axis labels */}
          <text x={pad.left + plotW / 2} y={height - 8} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill="var(--color-fg-subtle)">
            I (A)
          </text>
          <text x={12} y={pad.top + plotH / 2} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill="var(--color-fg-subtle)" transform={`rotate(-90 12 ${pad.top + plotH / 2})`}>
            V (V)
          </text>

          {/* Tick at origin and at maxI/maxV */}
          <text x={pad.left} y={pad.top + plotH + 16} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--color-fg-subtle)">
            0
          </text>
          <text x={pad.left + plotW} y={pad.top + plotH + 16} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--color-fg-subtle)">
            {maxI}
          </text>

          {/* The fitted line, extended to the y-axis so the intercept is visible */}
          <line x1={xOf(0)} y1={yOf(lineY0)} x2={xOf(lineX2)} y2={yOf(lineY2)} stroke="var(--color-accent)" strokeWidth={2} />

          {/* Y-intercept marker */}
          <circle cx={xOf(0)} cy={yOf(intercept)} r={4} fill="var(--color-warning)" />
          <text x={xOf(0) + 8} y={yOf(intercept) - 6} fontSize={11} fontFamily="var(--font-mono)" fill="var(--color-warning)">
            {`ε = ${intercept.toFixed(1)} V`}
          </text>

          {/* Measured data points */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={xOf(p.i)} cy={yOf(p.v)} r={4.5} fill="var(--color-surface)" stroke="var(--color-accent-strong)" strokeWidth={2} />
              <text x={xOf(p.i)} y={yOf(p.v) - 10} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--color-fg)">
                {`(${p.i}, ${p.v})`}
              </text>
            </g>
          ))}

          {/* Slope label, right-anchored in the top-right corner so it never overflows the viewBox
              or collides with the axis labels, regardless of where the data points fall */}
          <text x={pad.left + plotW} y={pad.top + 12} textAnchor="end" fontSize={11} fontFamily="var(--font-mono)" fill="var(--color-accent)">
            {`m = ${slope.toFixed(2)}  →  r = ${Math.abs(slope).toFixed(2)} Ω`}
          </text>
        </svg>
      </div>
      {caption && <figcaption className="border-t border-border px-4 py-2.5 text-xs text-fg-subtle">{caption}</figcaption>}
    </figure>
  )
}
