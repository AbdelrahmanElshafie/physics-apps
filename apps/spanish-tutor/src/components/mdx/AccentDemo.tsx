'use client'

import { SpeakButton } from '@/components/audio/SpeakButton'

/**
 * Minimal pairs for stress, side by side, played individually.
 *
 * Spanish stress is predictable from spelling, and a written accent marks every exception — so
 * two words spelled with the same letters can differ only in which syllable is stressed, and that
 * difference can be a whole tense (hablo "I speak" vs. habló "he spoke") or a whole word (el "the"
 * vs. él "he"). Played back to back, an untrained ear can't tell them apart; what works is a
 * visual anchor — the stressed syllable, bolded — to hold onto while comparing.
 *
 * Authors supply the syllable split explicitly rather than this component deriving it:
 * syllabification has real edge cases (diphthongs, hiatus) and the point is to show the stress,
 * not to implement a syllabifier. If the split doesn't reassemble into the word, the word is
 * shown plain rather than mis-split.
 */
export function AccentDemo({
  items,
}: {
  items: { word: string; syllables: string[]; stress: number; meaning: string }[]
}) {
  return (
    <div className="my-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item, i) => {
        const valid = item.syllables.join('') === item.word && item.stress < item.syllables.length
        return (
          <div
            key={i}
            className="flex items-center gap-3 rounded-panel border border-border bg-surface px-3.5 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="word-display text-2xl text-fg">
                  {valid
                    ? item.syllables.map((syl, j) =>
                        j === item.stress ? (
                          <span key={j} className="font-bold text-accent-strong underline decoration-2 underline-offset-4">
                            {syl}
                          </span>
                        ) : (
                          <span key={j}>{syl}</span>
                        ),
                      )
                    : item.word}
                </p>
                <SpeakButton text={item.word} />
              </div>
              <p className="mt-0.5 text-sm text-fg-muted">{item.meaning}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
