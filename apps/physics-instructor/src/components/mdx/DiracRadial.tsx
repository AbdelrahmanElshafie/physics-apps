'use client'

import { useMemo, useState } from 'react'

import { ALPHA, diracExponent, smallOverLarge } from '@core/domain'
import { cn } from '@/lib/utils'

/**
 * Hydrogenic Dirac 1s radial functions against Z.
 *
 * The argument for a relativistic treatment is usually made with the number (Z alpha)^2, which is
 * abstract enough to slide past. This makes it concrete: drag Z from hydrogen to uranium and watch
 * the small component climb from a rounding error to nearly forty per cent of the large one, while
 * the orbital pulls in toward the nucleus.
 *
 * For the Dirac ground state (kappa = -1, n = 1) both components share the same radial shape
 *
 *     P(r) = N sqrt(1 + gamma) r^gamma e^(-Zr)
 *     Q(r) = -N sqrt(1 - gamma) r^gamma e^(-Zr),      gamma = sqrt(1 - (Z alpha)^2)
 *
 * so their ratio is the constant -sqrt((1-gamma)/(1+gamma)). That is exact, not a model, which is
 * why this figure can be trusted as physics rather than illustration. The non-relativistic
 * P(r) = 2 Z^(3/2) r e^(-Zr) is drawn alongside; its r^1 against the relativistic r^gamma with
 * gamma < 1 is the contraction.
 */

const WIDTH = 460
const HEIGHT = 260
const PAD = { left: 44, right: 14, top: 14, bottom: 30 }

const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

function buildCurves(Z: number, samples = 260) {
  const gamma = diracExponent(Z)
  // Show a few Bohr radii of the contracted orbital, so the shape fills the axes at every Z.
  const rMax = 5 / Z

  const rel: number[] = []
  const small: number[] = []
  const nonRel: number[] = []

  for (let i = 0; i <= samples; i += 1) {
    const r = (i / samples) * rMax
    // r^gamma diverges weakly at the origin for gamma < 1; clamp the very first sample so the
    // curve stays drawable without pretending the divergence is not there.
    const shape = r === 0 ? 0 : Math.pow(r, gamma) * Math.exp(-Z * r)
    rel.push(Math.sqrt(1 + gamma) * shape)
    small.push(Math.sqrt(1 - gamma) * shape)
    nonRel.push(2 * Math.pow(Z, 1.5) * r * Math.exp(-Z * r))
  }

  // P and Q must share a scale, because the whole point is the ratio between them. The
  // non-relativistic curve gets its own, because it carries a different normalisation entirely:
  // scaling all three together makes it a hundred times taller and flattens the Dirac pair onto
  // the axis. Its job here is the shape, not the height.
  const relScale = Math.max(...rel) || 1
  const nrScale = Math.max(...nonRel) || 1

  const toPath = (values: number[], scale: number, sign = 1): string =>
    values
      .map((v, i) => {
        const x = PAD.left + (i / samples) * PLOT_W
        const y = PAD.top + PLOT_H / 2 - (sign * v * (PLOT_H / 2)) / scale
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')

  return {
    gamma,
    rMax,
    ratio: smallOverLarge(Z),
    large: toPath(rel, relScale),
    // The small component is negative; drawing it below the axis is what it actually is.
    smallComponent: toPath(small, relScale, -1),
    classical: toPath(nonRel, nrScale),
  }
}

/**
 * Chrome text, resolved by the MDX registry where the page's locale is known. `{z}` and
 * `{percent}` placeholders are substituted here.
 */
export interface DiracRadialStrings {
  charge: string
  chargeLabel: string
  alt: string
  negligible: string
  noticeable: string
  large: string
  keyLarge: string
  keySmall: string
  keyClassical: string
  marks: Record<number, string>
}

export function DiracRadial({
  initialZ = 42,
  caption,
  strings,
}: {
  initialZ?: number
  caption?: string
  strings: DiracRadialStrings
}) {
  const [Z, setZ] = useState(initialZ)
  const { gamma, rMax, ratio, large, smallComponent, classical } = useMemo(
    () => buildCurves(Z),
    [Z],
  )

  const percent = ratio * 100
  const severity = percent < 2 ? 'negligible' : percent < 10 ? 'noticeable' : 'large'
  // Below one per cent a single decimal rounds 0.36 to 0.4, which then disagrees with the
  // sentence next to it.
  const percentText = `${percent.toFixed(percent < 1 ? 2 : 1)}%`
  const fill = (template: string) =>
    template.replaceAll('{z}', String(Z)).replaceAll('{percent}', percentText)

  return (
    <figure className="my-6 overflow-hidden rounded-panel border border-border bg-surface-sunken/50">
      <div className="p-4">
        {/* data-ltr forces the whole figure left-to-right. A plot of r against P(r) reads the
            same way in every language, and without this the axis label is reordered and
            truncated inside an RTL page. */}
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full rounded-lg bg-canvas"
          role="img"
          data-ltr
          aria-label={fill(strings.alt)}
        >
          {/* zero line */}
          <line
            x1={PAD.left}
            y1={PAD.top + PLOT_H / 2}
            x2={WIDTH - PAD.right}
            y2={PAD.top + PLOT_H / 2}
            stroke="var(--color-border-strong)"
            strokeWidth="1"
          />
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={PAD.top + PLOT_H}
            stroke="var(--color-border-strong)"
            strokeWidth="1"
          />

          <polyline
            points={classical}
            fill="none"
            stroke="var(--color-fg-subtle)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <polyline
            points={large}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
          />
          <polyline
            points={smallComponent}
            fill="none"
            stroke="var(--color-warning)"
            strokeWidth="2.5"
          />

          <text x={PAD.left - 6} y={PAD.top + 10} textAnchor="end" fontSize="10" fill="var(--color-fg-subtle)">
            P
          </text>
          <text
            x={PAD.left - 6}
            y={PAD.top + PLOT_H - 2}
            textAnchor="end"
            fontSize="10"
            fill="var(--color-fg-subtle)"
          >
            Q
          </text>
          <text
            x={WIDTH - PAD.right}
            y={HEIGHT - 8}
            textAnchor="end"
            fontSize="10"
            fill="var(--color-fg-subtle)"
          >
            r → {rMax.toFixed(3)} a₀
          </text>
        </svg>

        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 flex items-baseline justify-between text-xs">
              <span className="text-fg-muted">
                {strings.charge} <span className="font-mono text-fg">Z = {Z}</span>
              </span>
              <span className="font-mono text-fg-subtle">{strings.marks[Z] ?? ELEMENTS[Z] ?? ''}</span>
            </span>
            <input
              type="range"
              min={1}
              max={92}
              value={Z}
              onChange={(e) => setZ(Number(e.target.value))}
              aria-label={strings.chargeLabel}
              className="w-full accent-[var(--color-accent)]"
            />
          </label>

          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            <Stat label="Zα" value={(Z * ALPHA).toFixed(3)} />
            <Stat label="γ" value={gamma.toFixed(4)} />
            <Stat label="|Q/P|" value={percentText} highlight={percent >= 10} />
          </div>

          <p
            className={cn(
              'rounded-lg border px-3 py-2 text-xs leading-relaxed',
              severity === 'large'
                ? 'border-danger/40 bg-danger-muted/25 text-fg'
                : severity === 'noticeable'
                  ? 'border-warning/40 bg-warning-muted/25 text-fg-muted'
                  : 'border-border bg-surface/40 text-fg-muted',
            )}
          >
            {fill(
              severity === 'negligible'
                ? strings.negligible
                : severity === 'noticeable'
                  ? strings.noticeable
                  : strings.large,
            )}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem]">
            <Key colour="bg-accent" label={strings.keyLarge} />
            <Key colour="bg-warning" label={strings.keySmall} />
            <Key colour="bg-fg-subtle" label={strings.keyClassical} dashed />
          </div>
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

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border px-2.5 py-1.5',
        highlight ? 'border-danger/40 bg-danger-muted/25' : 'border-border bg-surface/60',
      )}
    >
      <div className="text-[0.65rem] text-fg-subtle">{label}</div>
      <div className={cn('font-semibold', highlight ? 'text-danger' : 'text-fg')}>{value}</div>
    </div>
  )
}

function Key({ colour, label, dashed }: { colour: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-fg-subtle">
      <span className={cn('inline-block h-0.5 w-4', colour, dashed && 'opacity-60')} />
      {label}
    </span>
  )
}

/**
 * Element symbols for the landmark values of Z, so the slider means something physical rather
 * than just a number. Symbols are the same in every language; the three landmarks that carry
 * English words come from `strings.marks`.
 */
const ELEMENTS: Record<number, string> = {
  1: 'H',
  2: 'He',
  6: 'C',
  8: 'O',
  18: 'Ar',
  26: 'Fe',
  54: 'Xe',
  79: 'Au',
  82: 'Pb',
  92: 'U',
}
