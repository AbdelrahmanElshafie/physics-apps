/**
 * Numbered pinyin -> tone-marked pinyin, so content is authored (and exercises are checked)
 * against the form a keyboard can type — `ni3 hao3` — while lessons and vocab cards *display*
 * the conventional `nǐ hǎo`. One function, one place the mark-placement rule lives, rather than
 * hand-typing diacritics into every lesson file (which also could not be exercise-checked, since
 * `ǎ` and `a3` are not the same keystrokes).
 *
 * Mark placement follows the standard pinyin rule: `a` or `e` always takes the mark; else `o` in
 * an `ou` pair; else the last of `i`/`u`/`ü` in the syllable. A lone `v` is treated as `ü`, the
 * common keyboard stand-in where no umlaut key exists.
 */

const TONE_MARKS: Record<string, readonly [string, string, string, string, string]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

function markIndex(lower: string): number {
  if (lower.includes('a')) return lower.indexOf('a')
  if (lower.includes('e')) return lower.indexOf('e')
  if (lower.includes('ou')) return lower.indexOf('o')
  for (let i = lower.length - 1; i >= 0; i--) {
    if ('iuü'.includes(lower[i]!)) return i
  }
  return -1
}

function toneMarkSyllable(syllable: string): string {
  const m = /^([a-zA-Züv]+)([1-5])$/i.exec(syllable)
  if (!m) return syllable

  const letters = m[1]!
  const tone = Number(m[2]!)
  const withUmlaut = letters.replace(/v/g, 'ü').replace(/V/g, 'Ü')
  if (tone === 5) return withUmlaut // neutral tone carries no mark

  const lower = withUmlaut.toLowerCase()
  const index = markIndex(lower)
  if (index === -1) return withUmlaut

  const vowel = lower[index]!
  const marked = TONE_MARKS[vowel]?.[tone]
  if (!marked) return withUmlaut

  const original = withUmlaut[index]!
  const isUpper = original !== original.toLowerCase() && original === original.toUpperCase()
  return withUmlaut.slice(0, index) + (isUpper ? marked.toUpperCase() : marked) + withUmlaut.slice(index + 1)
}

/** `"ni3 hao3"` -> `"nǐ hǎo"`. Non-pinyin tokens (punctuation, already-marked text) pass through. */
export function toneMarkPinyin(numbered: string): string {
  return numbered
    .trim()
    .split(/\s+/)
    .map(toneMarkSyllable)
    .join(' ')
}

/** True when a string contains at least one CJK ideograph — used to decide whether a "listen to
 * this" button makes sense, since there is nothing useful to pronounce in plain English text. */
export function containsHanzi(text: string): boolean {
  return /[一-鿿]/.test(text)
}
