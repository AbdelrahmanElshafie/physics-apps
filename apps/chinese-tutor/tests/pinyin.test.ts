import { describe, expect, it } from 'vitest'
import { containsHanzi, toneMarkPinyin } from '@core/domain'

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

  it('marks the tone-pairs lesson vocabulary exactly as printed, in both written and sandhi form', () => {
    expect(toneMarkPinyin('ni2 hao3')).toBe('ní hǎo') // spoken (3rd+3rd sandhi)
    expect(toneMarkPinyin('hen3 hao3')).toBe('hěn hǎo') // written
    expect(toneMarkPinyin('hen2 hao3')).toBe('hén hǎo') // spoken (3rd+3rd sandhi)
    expect(toneMarkPinyin('bu2 shi4')).toBe('bú shì') // bù sandhi before a 4th tone
    expect(toneMarkPinyin('bu2 qu4')).toBe('bú qù') // bù sandhi before a 4th tone
    expect(toneMarkPinyin('bu4 lai2')).toBe('bù lái') // no sandhi — lái isn't 4th tone
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

describe('containsHanzi', () => {
  it('detects a CJK ideograph among plain text', () => {
    expect(containsHanzi('你好')).toBe(true)
    expect(containsHanzi('say 你好 to greet someone')).toBe(true)
  })

  it('is false for pinyin, English, and punctuation with no hanzi', () => {
    expect(containsHanzi('nǐ hǎo')).toBe(false)
    expect(containsHanzi('First tone — flat and high')).toBe(false)
    expect(containsHanzi('')).toBe(false)
  })
})
