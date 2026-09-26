import type { Exercise } from '../domain/exercise'
import type { GlossaryEntry } from '../domain/lesson'
import type { Lesson } from '../domain/lesson'
import type { SyllabusId, TopicId } from '../domain/ids'
import type { Locale } from '../domain/locale'
import type { Syllabus } from '../domain/syllabus'

/**
 * Read access to authored content.
 *
 * Implemented today by the filesystem adapter reading `content/syllabi/**`. A SQLite or CMS
 * implementation (M5) satisfies the same interface, so nothing above this line changes.
 */
export interface ContentRepository {
  listSyllabi(locale?: Locale): Promise<Syllabus[]>
  /** The tree itself is translated too, so the navigator is not English inside an Arabic page. */
  getSyllabus(id: SyllabusId, locale?: Locale): Promise<Syllabus | null>
  /** Every topic across every syllabus, keyed by qualified id — the graph works on this. */
  allTopics(): Promise<Map<TopicId, import('../domain/syllabus').Topic>>
  /**
   * `locale` is a request, not a guarantee. When no translation exists the English original is
   * returned and `servedLocale` says so, which is what lets the UI be honest about it instead of
   * silently showing the wrong language.
   */
  getLesson(topicId: TopicId, locale?: Locale): Promise<Lesson | null>
  getExercises(topicId: TopicId, locale?: Locale): Promise<Exercise[]>
  getGlossary(syllabusId: SyllabusId): Promise<GlossaryEntry[]>
}
