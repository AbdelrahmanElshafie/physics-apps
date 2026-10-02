import { describe, expect, it } from 'vitest'
import { PERSONS, conjugatePresent, presentTable, stem, verbClass } from '@core/domain'

/**
 * Every regular conjugation table printed in a lesson is checked here against what the rule
 * actually produces — the same "a form a lesson prints is a form a test checks" discipline
 * chinese-tutor applies to pinyin and russian-tutor to stress, applied to verb endings instead.
 */

describe('verbClass', () => {
  it('classifies the three regular conjugations by infinitive ending', () => {
    expect(verbClass('hablar')).toBe('ar')
    expect(verbClass('comer')).toBe('er')
    expect(verbClass('vivir')).toBe('ir')
  })

  it('refuses anything that is not an -ar/-er/-ir infinitive', () => {
    expect(verbClass('libro')).toBeNull()
    expect(verbClass('hola')).toBeNull()
    expect(verbClass('')).toBeNull()
  })

  it('is case-insensitive about the ending', () => {
    expect(verbClass('HABLAR')).toBe('ar')
  })
})

describe('stem', () => {
  it('is the infinitive minus its two-letter ending', () => {
    expect(stem('hablar')).toBe('habl')
    expect(stem('comer')).toBe('com')
    expect(stem('vivir')).toBe('viv')
    expect(stem('libro')).toBeNull()
  })
})

describe('conjugatePresent', () => {
  it('produces the hablar table exactly as the present-tense-ar lesson prints it', () => {
    expect(PERSONS.map((p) => conjugatePresent('hablar', p))).toEqual([
      'hablo', 'hablas', 'habla', 'hablamos', 'habláis', 'hablan',
    ])
  })

  it('produces the trabajar and estudiar tables exactly as the present-tense-ar lesson prints them', () => {
    expect(presentTable('trabajar')).toEqual([
      'trabajo', 'trabajas', 'trabaja', 'trabajamos', 'trabajáis', 'trabajan',
    ])
    expect(presentTable('estudiar')).toEqual([
      'estudio', 'estudias', 'estudia', 'estudiamos', 'estudiáis', 'estudian',
    ])
  })

  it('produces the comer table exactly as the present-tense-er-ir lesson prints it', () => {
    expect(PERSONS.map((p) => conjugatePresent('comer', p))).toEqual([
      'como', 'comes', 'come', 'comemos', 'coméis', 'comen',
    ])
  })

  it('produces the vivir table exactly as the present-tense-er-ir lesson prints it', () => {
    expect(PERSONS.map((p) => conjugatePresent('vivir', p))).toEqual([
      'vivo', 'vives', 'vive', 'vivimos', 'vivís', 'viven',
    ])
  })

  it('produces the aprender and escribir tables exactly as the present-tense-er-ir lesson prints them', () => {
    expect(presentTable('aprender')).toEqual([
      'aprendo', 'aprendes', 'aprende', 'aprendemos', 'aprendéis', 'aprenden',
    ])
    expect(presentTable('escribir')).toEqual([
      'escribo', 'escribes', 'escribe', 'escribimos', 'escribís', 'escriben',
    ])
    // leer is described in prose as regular in the present; hold it to that.
    expect(presentTable('leer')).toEqual(['leo', 'lees', 'lee', 'leemos', 'leéis', 'leen'])
  })

  it('shares every ending but nosotros/vosotros between -er and -ir', () => {
    const er = presentTable('comer')!
    const ir = presentTable('vivir')!
    for (const i of [0, 1, 2, 5]) expect(er[i]!.slice(3)).toBe(ir[i]!.slice(3))
    expect(er[3]).toBe('comemos')
    expect(ir[3]).toBe('vivimos')
  })

  it('returns null rather than a wrong form for a non-infinitive', () => {
    expect(conjugatePresent('libro', 'yo')).toBeNull()
    expect(presentTable('hola')).toBeNull()
  })

  it('is mechanical — irregular verbs are hand-written in content, never routed through here', () => {
    // Documented boundary, not a bug: the function does not know ser is irregular, and content
    // must not use it for one. The real form is "soy".
    expect(conjugatePresent('ser', 'yo')).toBe('so')
    expect(conjugatePresent('ir', 'yo')).toBe('o')
  })
})
