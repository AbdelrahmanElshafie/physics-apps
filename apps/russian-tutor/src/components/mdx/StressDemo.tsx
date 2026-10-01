import { SpeakButton } from '@/components/audio/SpeakButton'

/**
 * Minimal pairs for stress, side by side, played individually.
 *
 * Russian stress isn't written down, can land on any syllable, and occasionally changes meaning
 * outright — за́мок (CASTLE) and замо́к (LOCK) are the same five letters. Hearing both read aloud
 * one after the other doesn't teach an ear to separate them any better than Mandarin's four tones
 * did; the fix is the same one as there: play one in isolation, then a different one, with a
 * visual anchor — here, the stressed vowel itself, bolded — to hold onto while comparing.
 */

const COMBINING_ACUTE = '́'

function splitStress(stressed: string): { before: string; vowel: string; after: string } {
  const idx = stressed.indexOf(COMBINING_ACUTE)
  if (idx <= 0) return { before: stressed, vowel: '', after: '' }
  return { before: stressed.slice(0, idx - 1), vowel: stressed[idx - 1]!, after: stressed.slice(idx + 1) }
}

export function StressDemo({
  items,
}: {
  items: { word: string; stressed: string; meaning: string }[]
}) {
  return (
    <div className="my-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item, i) => {
        const { before, vowel, after } = splitStress(item.stressed)
        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-panel border border-border bg-surface px-3.5 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="word-display text-2xl text-fg">{item.word}</p>
                <SpeakButton text={item.word} />
              </div>
              <p className="text-sm text-fg-subtle">
                {before}
                <span className="font-bold text-accent-strong">{vowel}{COMBINING_ACUTE}</span>
                {after}
              </p>
              <p className="text-sm text-fg-muted">{item.meaning}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
