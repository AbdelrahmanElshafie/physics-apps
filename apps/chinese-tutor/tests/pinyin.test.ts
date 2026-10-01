import { describe, expect, it } from 'vitest'
import { toneMarkPinyin } from '@core/domain'

/**
 * Every toned syllable printed in a lesson is checked here against the numbered form a function
 * actually produces — the same "a number a lesson prints is a number a test checks" discipline
 * the physics apps use for worked values, applied to pinyin instead.
 */

describe('toneMarkPinyin', () => {
  it('marks all four tones plus neutral on the classic ma set (pinyin-and-tones lesson)', () => {
    expect(toneMarkPinyin('ma1')).toBe('mā')
    expect(toneMarkPinyin('ma2')).toBe('má')
    expect(toneMarkPinyin('ma3')).toBe('mǎ')
    expect(toneMarkPinyin('ma4')).toBe('mà')
    expect(toneMarkPinyin('ma5')).toBe('ma')
  })

  it('marks the greetings lesson vocabulary exactly as printed', () => {
    expect(toneMarkPinyin('ni3 hao3')).toBe('nǐ hǎo')
    expect(toneMarkPinyin('nin2 hao3')).toBe('nín hǎo')
    expect(toneMarkPinyin('xie4 xie5')).toBe('xiè xie')
    expect(toneMarkPinyin('bu2 ke4 qi5')).toBe('bú kè qi')
    expect(toneMarkPinyin('dui4 bu5 qi3')).toBe('duì bu qǐ')
    expect(toneMarkPinyin('bu4 hao3 yi4 si5')).toBe('bù hǎo yì si')
    expect(toneMarkPinyin('zai4 jian4')).toBe('zài jiàn')
  })

  it('places the mark on a, then e, over i/u/ü, per the standard pinyin rule', () => {
    expect(toneMarkPinyin('hao3')).toBe('hǎo') // a beats o
    expect(toneMarkPinyin('hen3')).toBe('hěn') // e, only vowel
    expect(toneMarkPinyin('jiu3')).toBe('jiǔ') // last of i/u when no a/e/ou
    expect(toneMarkPinyin('gui4')).toBe('guì') // last of i/u in "ui"
  })

  it('treats a bare "v" as the keyboard stand-in for ü', () => {
    expect(toneMarkPinyin('lv4')).toBe('lǜ')
  })

  it('leaves non-pinyin tokens untouched', () => {
    expect(toneMarkPinyin('!')).toBe('!')
  })
})
