import { SpeakButton } from '@/components/audio/SpeakButton'

/**
 * The four tones, side by side: a pitch-contour line (what your voice's pitch actually does),
 * played individually rather than as one run-together phrase.
 *
 * Hearing "mā má mǎ mà" spoken in a row doesn't teach an untrained ear to tell them apart — they
 * blur together on a first listen. What actually works is comparison: play *one*, listen, play a
 * *different* one, listen, and have a visual anchor (the shape your pitch traces) to hold onto
 * while you do it. That's why each tone gets its own button instead of a single combined one.
 */

const TONE_SHAPES: Record<number, { path: string; label: string }> = {
  1: { path: 'M 4 10 L 56 10', label: 'flat and high' },
  2: { path: 'M 4 34 L 56 10', label: 'rising' },
  3: { path: 'M 4 22 Q 30 44 56 14', label: 'dips, then rises' },
  4: { path: 'M 4 8 L 56 38', label: 'falling sharply' },
  5: { path: 'M 4 26 L 56 26', label: 'short and light' },
}

function ToneShape({ tone }: { tone: number }) {
  const shape = TONE_SHAPES[tone] ?? TONE_SHAPES[5]!
  return (
    <svg viewBox="0 0 60 48" className="h-12 w-[60px] shrink-0" aria-hidden>
      {/* The four reference lines a tone's pitch moves between — high, mid-high, mid-low, low. */}
      {[8, 18, 28, 38].map((y) => (
        <line key={y} x1={0} y1={y} x2={60} y2={y} stroke="var(--color-border)" strokeWidth={1} />
      ))}
      <path d={shape.path} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  )
}

export function ToneDemo({
  items,
}: {
  items: { tone: number; hanzi: string; pinyin: string; meaning: string }[]
}) {
  return (
    <div className="my-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-panel border border-border bg-surface px-3.5 py-3"
        >
          <ToneShape tone={item.tone} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="hanzi-display text-2xl text-fg">{item.hanzi}</p>
              <SpeakButton text={item.hanzi} />
            </div>
            <p className="font-mono text-sm text-accent-strong">{item.pinyin}</p>
            <p className="text-sm text-fg-muted">{item.meaning}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
