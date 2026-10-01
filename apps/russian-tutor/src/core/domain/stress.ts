/**
 * Russian word stress — unmarked in normal writing, unpredictable from spelling, and the single
 * biggest source of "that doesn't sound right" for a learner, the way tone is for Mandarin. A few
 * minimal pairs even change meaning on stress alone (за́мок "castle" vs. замо́к "lock" — same
 * letters, different stressed vowel).
 *
 * Content is authored with the stressed vowel followed by an apostrophe — `зам'ок` — the
 * keyboard-friendly form, the same way pinyin content is authored as `ni3 hao3` rather than typed
 * diacritics. `markStress` turns that into the properly accented display form, `зам́ок`-style,
 * using a combining acute accent (U+0301) placed immediately after the vowel it marks.
 */

const VOWELS = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ'
const COMBINING_ACUTE = '́'

function markStressWord(word: string): string {
  const idx = word.indexOf("'")
  if (idx <= 0) return word.replace("'", '')

  const stressedVowel = word[idx - 1]!
  if (!VOWELS.includes(stressedVowel)) return word.replace("'", '')

  return word.slice(0, idx) + COMBINING_ACUTE + word.slice(idx + 1)
}

/**
 * `"молок'о"` -> `"молоко́"`. A missing or misplaced apostrophe leaves that word unchanged.
 *
 * Splits on whitespace and marks each token independently, so a whole apostrophe-authored phrase
 * (`"приве'т, как дела'?"`) is accepted directly — not just a single word — the same way
 * `toneMarkPinyin` marks a space-separated run of numbered syllables rather than only one at a
 * time. A single word with no spaces is unaffected by the split.
 */
export function markStress(phrase: string): string {
  return phrase.split(/(\s+)/).map(markStressWord).join('')
}

/** True when a string contains at least one Cyrillic letter — used to decide whether a "listen to
 * this" button makes sense, since there is nothing useful to pronounce in plain English text. */
export function containsCyrillic(text: string): boolean {
  return /[Ѐ-ӿ]/.test(text)
}
