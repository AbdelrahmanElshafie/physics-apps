/**
 * Regular present-tense conjugation — this app's equivalent of chinese-tutor's `toneMarkPinyin`
 * and russian-tutor's `markStress`: one pure function, one place the rule lives, so a form a
 * lesson prints is a form a test can check.
 *
 * Spanish spells its own pronunciation (accents included), so there's no hidden reading layer to
 * derive the way pinyin or Cyrillic stress needed. What *is* rule-governed and worth checking is
 * conjugation: every regular -ar/-er/-ir verb takes the same six endings, and a lesson that prints
 * hablo / hablas / habla / hablamos / habláis / hablan should be printing exactly what the rule
 * produces. Irregular verbs (ser, estar, tener, ir…) are hand-written in content and deliberately
 * *not* routed through here — this function is mechanical and will happily produce "so" for ser.
 * The tests document that boundary rather than papering over it.
 */

export const PERSONS = ['yo', 'tú', 'él', 'nosotros', 'vosotros', 'ellos'] as const
export type Person = (typeof PERSONS)[number]

export type VerbClass = 'ar' | 'er' | 'ir'

const PRESENT_ENDINGS: Record<VerbClass, readonly [string, string, string, string, string, string]> = {
  ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
  er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
  ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
}

/** `'hablar'` -> `'ar'`; anything that doesn't end in -ar/-er/-ir -> `null`. */
export function verbClass(infinitive: string): VerbClass | null {
  const ending = infinitive.slice(-2).toLowerCase()
  return ending === 'ar' || ending === 'er' || ending === 'ir' ? ending : null
}

/** The stem is simply the infinitive minus its two-letter class ending: `hablar` -> `habl`. */
export function stem(infinitive: string): string | null {
  return verbClass(infinitive) ? infinitive.slice(0, -2) : null
}

/**
 * `conjugatePresent('hablar', 'tú')` -> `'hablas'`. Returns `null` for anything that isn't an
 * -ar/-er/-ir infinitive, so a caller can't accidentally conjugate a noun.
 */
export function conjugatePresent(infinitive: string, person: Person): string | null {
  const cls = verbClass(infinitive)
  if (!cls) return null
  const index = PERSONS.indexOf(person)
  return infinitive.slice(0, -2) + PRESENT_ENDINGS[cls][index]
}

/** All six forms in person order — what a conjugation table in a lesson prints. */
export function presentTable(infinitive: string): readonly string[] | null {
  const cls = verbClass(infinitive)
  if (!cls) return null
  const base = infinitive.slice(0, -2)
  return PRESENT_ENDINGS[cls].map((ending) => base + ending)
}
