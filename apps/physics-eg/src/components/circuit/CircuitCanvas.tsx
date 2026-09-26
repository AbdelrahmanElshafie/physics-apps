'use client'

import { useMemo, useState } from 'react'
import { Battery, CircleDot, Gauge, Trash2, ToggleLeft, Waves, Zap } from 'lucide-react'

import { solveCircuit } from '@physics/circuit-sim'
import { cn } from '@/lib/utils'

import {
  COMPONENT_KINDS,
  computeLanes,
  defaultComponent,
  pointsInUse,
  samePoint,
  toCircuit,
  type ComponentKind,
  type GridPoint,
  type PlacedComponent,
} from './grid'

/**
 * A breadboard-style circuit builder: pick a tool, click a starting dot, click an ending dot, and
 * the wire/resistor/battery/switch/meter that connects them appears. Every change re-solves
 * immediately through `@physics/circuit-sim`, so a student sees the current the moment the loop
 * closes rather than after pressing a separate "run" button.
 *
 * Deliberately click-to-place rather than free drag-from-a-palette: a breadboard hole is a
 * discrete slot, not a continuous canvas, so snapping to the grid is the *correct* model here, not
 * a simplification of one. Repositioning an existing component by dragging an endpoint is a
 * reasonable fast-follow, not yet built — for now, delete and re-place it.
 */

const COLS = 12
const ROWS = 7
const CELL = 56
const PAD = 32
const WIDTH = PAD * 2 + CELL * (COLS - 1)
const HEIGHT = PAD * 2 + CELL * (ROWS - 1)

const TOOL_META: Record<ComponentKind, { label: string; icon: typeof Zap }> = {
  wire: { label: 'سلك', icon: Waves },
  resistor: { label: 'مقاومة', icon: Zap },
  battery: { label: 'بطارية', icon: Battery },
  switch: { label: 'مفتاح', icon: ToggleLeft },
  ammeter: { label: 'أميتر', icon: Gauge },
  voltmeter: { label: 'فولتميتر', icon: CircleDot },
}

let nextId = 1
const freshId = (kind: string) => `${kind}-${nextId++}`

function pixelOf(p: GridPoint): { x: number; y: number } {
  return { x: PAD + p.col * CELL, y: PAD + p.row * CELL }
}

export interface CircuitCanvasProps {
  /** Starting components — used to seed a worked example. Omit for an empty sandbox. */
  initial?: PlacedComponent[]
  /**
   * Which point is the 0 V reference. Defaults to the first component's first terminal, which is
   * fine for a sandbox but worth setting explicitly on an authored lesson diagram rather than
   * relying on array order.
   */
  ground?: GridPoint
  /** Fixed diagram for reading, not building: no toolbar, no editing, values always shown. */
  readOnly?: boolean
  caption?: string
  className?: string
}

export function CircuitCanvas({ initial, ground: initialGround, readOnly = false, caption, className }: CircuitCanvasProps) {
  const [components, setComponents] = useState<PlacedComponent[]>(initial ?? [])
  const [tool, setTool] = useState<ComponentKind>('resistor')
  const [pending, setPending] = useState<GridPoint | null>(null)
  const [ground, setGround] = useState<GridPoint | null>(initialGround ?? initial?.[0]?.a ?? null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [groundMode, setGroundMode] = useState(false)

  const result = useMemo(() => solveCircuit(toCircuit(components, ground)), [components, ground])
  const selected = components.find((c) => c.id === selectedId) ?? null
  const usedPoints = useMemo(() => pointsInUse(components), [components])

  // A voltmeter across a resistor (or an ammeter alongside a wire) shares its exact two endpoints
  // with another component — physically correct, but drawn as two overlapping lines and two
  // overlapping labels unless each one is fanned out to its own lane.
  const laneOf = useMemo(() => computeLanes(components), [components])

  const handlePointClick = (point: GridPoint) => {
    if (readOnly) return

    if (groundMode) {
      setGround(point)
      setGroundMode(false)
      return
    }

    if (!pending) {
      setPending(point)
      return
    }
    if (samePoint(pending, point)) {
      setPending(null)
      return
    }

    const id = freshId(tool)
    const next = defaultComponent(tool, id, pending, point)
    setComponents((prev) => [...prev, next])
    setSelectedId(id)
    setPending(null)
    setGround((g) => g ?? pending)
  }

  // Typed loosely on purpose: PlacedComponent is a discriminated union, so `Partial<PlacedComponent>`
  // would only admit the fields every variant shares (id, kind, a, b) — not `ohms` or `volts`.
  // Every call site below only ever passes fields that belong to the kind it just checked, guarded
  // by `selected.kind === '...'` immediately above it.
  const updateSelected = (patch: Record<string, unknown>) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === selectedId ? ({ ...c, ...patch } as PlacedComponent) : c)),
    )
  }

  const deleteSelected = () => {
    if (!selectedId) return
    setComponents((prev) => prev.filter((c) => c.id !== selectedId))
    setSelectedId(null)
  }

  return (
    <figure
      className={cn(
        'my-6 overflow-hidden rounded-panel border border-border bg-surface-sunken/50',
        className,
      )}
    >
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-surface-raised px-3 py-2.5">
          {COMPONENT_KINDS.map((kind) => {
            const Icon = TOOL_META[kind].icon
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setTool(kind)
                  setPending(null)
                  setGroundMode(false)
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                  tool === kind && !groundMode
                    ? 'bg-accent text-canvas'
                    : 'text-fg-subtle hover:bg-surface hover:text-fg',
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {TOOL_META[kind].label}
              </button>
            )
          })}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={() => {
              setGroundMode((g) => !g)
              setPending(null)
            }}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
              groundMode ? 'bg-warning text-canvas' : 'text-fg-subtle hover:bg-surface hover:text-fg',
            )}
          >
            حدّد الأرضي (0V)
          </button>
          <span className="ms-auto text-xs text-fg-subtle">
            {pending ? 'دوس على النقطة التانية عشان توصل' : 'دوس نقطة، وبعدين التانية'}
          </span>
        </div>
      )}

      <div className="pane-scroll overflow-x-auto p-3" data-ltr>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          role="img"
          aria-label="لوح بناء الدائرة الكهربية"
          className="max-w-full rounded-lg bg-canvas"
          style={{ minWidth: WIDTH * 0.55 }}
        >
          {/* Dot grid */}
          {!readOnly &&
            Array.from({ length: COLS }).map((_, col) =>
              Array.from({ length: ROWS }).map((_, row) => {
                const p = { col, row }
                const { x, y } = pixelOf(p)
                const active = usedPoints.some((u) => samePoint(u, p))
                const isPending = pending && samePoint(pending, p)
                const isGround = ground && samePoint(ground, p)
                return (
                  <circle
                    key={`${col}-${row}`}
                    cx={x}
                    cy={y}
                    r={isPending ? 7 : 4}
                    fill={
                      isGround
                        ? 'var(--color-warning)'
                        : isPending
                          ? 'var(--color-accent)'
                          : active
                            ? 'var(--color-fg-subtle)'
                            : 'var(--color-border-strong)'
                    }
                    className={cn(!readOnly && 'cursor-pointer', groundMode && 'cursor-crosshair')}
                    onClick={() => handlePointClick(p)}
                  />
                )
              }),
            )}

          {components.map((c) => (
            <ComponentGlyph
              key={c.id}
              component={c}
              selected={c.id === selectedId}
              lane={laneOf.get(c.id) ?? 0}
              current={result.ok ? result.current.get(c.id) : undefined}
              voltage={result.ok ? result.voltage.get(c.id) : undefined}
              onSelect={() => !readOnly && setSelectedId(c.id)}
            />
          ))}

          {ground && <GroundMark point={ground} />}
        </svg>
      </div>

      {!readOnly && !result.ok && components.length > 0 && (
        <p className="border-t border-danger/30 bg-danger-muted/20 px-4 py-2.5 text-xs text-danger">
          {result.error}
        </p>
      )}

      {!readOnly && selected && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface/60 px-4 py-2.5">
          <span className="text-xs font-semibold text-fg">{TOOL_META[selected.kind].label}</span>

          {selected.kind === 'resistor' && (
            <label className="flex items-center gap-1.5 text-xs text-fg-muted">
              R =
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={selected.ohms}
                onChange={(e) => updateSelected({ ohms: Number(e.target.value) || 0.1 })}
                className="w-20 rounded-md border border-border-strong bg-surface-sunken px-2 py-1 text-fg"
              />
              Ω
            </label>
          )}

          {selected.kind === 'battery' && (
            <>
              <label className="flex items-center gap-1.5 text-xs text-fg-muted">
                V =
                <input
                  type="number"
                  step={0.1}
                  value={selected.volts}
                  onChange={(e) => updateSelected({ volts: Number(e.target.value) || 0 })}
                  className="w-20 rounded-md border border-border-strong bg-surface-sunken px-2 py-1 text-fg"
                />
                فولت
              </label>
              <label className="flex items-center gap-1.5 text-xs text-fg-muted">
                r =
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={selected.internalOhms}
                  onChange={(e) => updateSelected({ internalOhms: Number(e.target.value) || 0 })}
                  className="w-20 rounded-md border border-border-strong bg-surface-sunken px-2 py-1 text-fg"
                />
                Ω داخلية
              </label>
            </>
          )}

          {selected.kind === 'switch' && (
            <button
              type="button"
              onClick={() => updateSelected({ closed: !selected.closed })}
              className="rounded-md border border-border-strong bg-surface-sunken px-2.5 py-1 text-xs text-fg"
            >
              {selected.closed ? 'مقفول — دوس تفتحه' : 'مفتوح — دوس تقفله'}
            </button>
          )}

          <button
            type="button"
            onClick={deleteSelected}
            className="ms-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-danger hover:bg-danger-muted/30"
          >
            <Trash2 className="size-3.5" aria-hidden />
            امسح
          </button>
        </div>
      )}

      {caption && (
        <figcaption className="border-t border-border bg-surface/60 px-4 py-2.5 text-xs leading-relaxed text-fg-subtle">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

function GroundMark({ point }: { point: GridPoint }) {
  const { x, y } = pixelOf(point)
  return (
    <g transform={`translate(${x}, ${y + 10})`} aria-hidden>
      <line x1={0} y1={0} x2={0} y2={8} stroke="var(--color-warning)" strokeWidth={1.5} />
      <line x1={-8} y1={8} x2={8} y2={8} stroke="var(--color-warning)" strokeWidth={1.5} />
      <line x1={-5} y1={11} x2={5} y2={11} stroke="var(--color-warning)" strokeWidth={1.5} />
      <line x1={-2} y1={14} x2={2} y2={14} stroke="var(--color-warning)" strokeWidth={1.5} />
    </g>
  )
}

/** Pixels of perpendicular offset per whole lane — how far apart two components sharing an edge are fanned. */
const LANE_SPACING = 24

function ComponentGlyph({
  component,
  selected,
  lane,
  current,
  voltage,
  onSelect,
}: {
  component: PlacedComponent
  selected: boolean
  /** 0 for the common case (this edge belongs to only one component); ±0.5, ±1, ... when shared. */
  lane: number
  current: number | undefined
  voltage: number | undefined
  onSelect: () => void
}) {
  const pa = pixelOf(component.a)
  const pb = pixelOf(component.b)
  const mx = (pa.x + pb.x) / 2
  const my = (pa.y + pb.y) / 2
  const angle = (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI

  // Bow the connecting line out from the straight a-b line by `lane` lanes, via a quadratic
  // Bezier — both endpoints stay exactly on their grid dots either way, only the middle moves.
  // This is what keeps a voltmeter drawn across a resistor from sitting directly on top of it.
  const length = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1
  const perpX = (-(pb.y - pa.y) / length) * lane * LANE_SPACING
  const perpY = ((pb.x - pa.x) / length) * lane * LANE_SPACING
  const controlX = mx + perpX * 2
  const controlY = my + perpY * 2
  const curveMidX = mx + perpX
  const curveMidY = my + perpY
  const pathD = `M ${pa.x} ${pa.y} Q ${controlX} ${controlY} ${pb.x} ${pb.y}`

  // The value label's default spot is straight above the line's own midpoint — true for every
  // component that isn't sharing an edge, regardless of the line's orientation, and simpler than a
  // perpendicular-normal calculation that would put a vertical component's label to one side
  // instead. Only when an edge *is* shared (a voltmeter across a resistor) does the label need to
  // follow that component's own bow outward, or the two labels land on top of each other.
  const labelX = lane === 0 ? mx : curveMidX
  const labelY = lane === 0 ? my - 16 : curveMidY + Math.sign(lane) * 14

  const strokeColour = selected
    ? 'var(--color-accent)'
    : component.kind === 'switch' && !component.closed
      ? 'var(--color-danger)'
      : 'var(--color-fg-muted)'

  const magnitude = current !== undefined && Number.isFinite(current) ? Math.abs(current) : undefined
  const flowing = magnitude !== undefined && magnitude > 1e-9

  return (
    <g onClick={onSelect} className="cursor-pointer">
      <path d={pathD} fill="none" stroke={strokeColour} strokeWidth={selected ? 3 : 2} />

      {flowing && (
        <path d={pathD} fill="none" stroke="var(--color-success)" strokeWidth={2} strokeDasharray="2 6" opacity={0.85}>
          <animate
            attributeName="stroke-dashoffset"
            // A negative current (a to b defined direction) means real current flows b to a —
            // reverse the animation direction so the dashes visibly flow the way electrons don't
            // and conventional current does.
            from={current! >= 0 ? '16' : '0'}
            to={current! >= 0 ? '0' : '16'}
            dur={`${Math.max(0.2, 1.4 / Math.min(3, Math.max(0.15, magnitude!)))}s`}
            repeatCount="indefinite"
          />
        </path>
      )}

      <g transform={`translate(${curveMidX}, ${curveMidY}) rotate(${angle})`}>
        <rect
          x={-16}
          y={-9}
          width={32}
          height={18}
          rx={4}
          fill="var(--color-surface)"
          stroke={strokeColour}
          strokeWidth={1.25}
        />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(${-angle})`}
          fontSize={10}
          fontFamily="var(--font-mono)"
          fill="var(--color-fg)"
        >
          {glyphLabel(component)}
        </text>
      </g>

      {(magnitude !== undefined || voltage !== undefined) && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fontSize={10}
          fontFamily="var(--font-mono)"
          fill="var(--color-accent-strong)"
        >
          {readout(component, magnitude, voltage)}
        </text>
      )}
    </g>
  )
}

function glyphLabel(c: PlacedComponent): string {
  switch (c.kind) {
    case 'resistor':
      return `${c.ohms}Ω`
    case 'battery':
      return `${c.volts}V`
    case 'switch':
      return c.closed ? 'K↓' : 'K↑'
    case 'ammeter':
      return 'A'
    case 'voltmeter':
      return 'V'
    case 'wire':
      return ''
  }
}

function readout(c: PlacedComponent, magnitude: number | undefined, voltage: number | undefined): string {
  if (c.kind === 'voltmeter') {
    return voltage === undefined || Number.isNaN(voltage) ? '' : `${voltage.toFixed(2)}V`
  }
  if (c.kind === 'ammeter') {
    return magnitude === undefined ? '' : `${magnitude.toFixed(2)}A`
  }
  if (c.kind === 'wire') return ''
  return magnitude === undefined ? '' : `${magnitude.toFixed(2)}A`
}
