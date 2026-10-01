import { describe, expect, it } from 'vitest'
import { containsCyrillic, markStress } from '@core/domain'

/**
 * Every stress-marked word printed in a lesson is checked here against the apostrophe-authored
 * form a function actually produces — the same "a mark a lesson prints is a mark a test checks"
 * discipline chinese-tutor uses for pinyin, applied to Russian stress instead.
 */

describe('markStress', () => {
  it('marks the greetings lesson vocabulary exactly as printed', () => {
    expect(markStress("приве'т")).toBe('приве́т')
    expect(markStress("здра'вствуйте")).toBe('здра́вствуйте')
    expect(markStress("спаси'бо")).toBe('спаси́бо')
    expect(markStress("пожа'луйста")).toBe('пожа́луйста')
    expect(markStress("свида'ния")).toBe('свида́ния')
    expect(markStress("пока'")).toBe('пока́')
    expect(markStress("извини'те")).toBe('извини́те')
  })

  it('marks the castle/lock minimal pair from the stress lesson, distinguished only by stress', () => {
    expect(markStress("за'мок")).toBe('за́мок') // castle
    expect(markStress("замо'к")).toBe('замо́к') // lock
  })

  it('marks the vowel-reduction lesson vocabulary exactly as printed', () => {
    expect(markStress("молоко'")).toBe('молоко́')
    expect(markStress("хорошо'")).toBe('хорошо́')
    expect(markStress("земля'")).toBe('земля́')
  })

  it('leaves a word with no apostrophe unchanged — monosyllables carry no stress mark', () => {
    expect(markStress('да')).toBe('да')
    expect(markStress('нет')).toBe('нет')
  })

  it('strips a misplaced apostrophe (not immediately after a vowel) rather than marking the wrong letter', () => {
    expect(markStress("пр'ивет")).toBe('привет') // apostrophe after a consonant
    expect(markStress("'привет")).toBe('привет') // apostrophe at the very start
  })
})

describe('containsCyrillic', () => {
  it('detects a Cyrillic letter among plain text', () => {
    expect(containsCyrillic('привет')).toBe(true)
    expect(containsCyrillic('say привет to greet someone')).toBe(true)
  })

  it('is false for plain English text with no Cyrillic', () => {
    expect(containsCyrillic('hello')).toBe(false)
    expect(containsCyrillic('First tone — flat and high')).toBe(false)
    expect(containsCyrillic('')).toBe(false)
  })
})
