import type { Exercise } from '../domain/exercise'
import type { GlossaryEntry, Lesson } from '../domain/lesson'
import type { SyllabusId, TopicId } from '../domain/ids'
import type { Syllabus, Topic } from '../domain/syllabus'

/**
 * Read access to authored content.
 *
 * Implemented by a filesystem adapter reading `content/syllabi/**` in each app. A SQLite or CMS
 * implementation satisfies the same interface, so nothing above this line changes.
 *
 * `locale` is a plain string rather than a fixed union: each app owns its own set of supported
 * locales (physics-instructor offers English and Arabic; physics-eg is Arabic-only), and this
 * port has no business knowing which.
 */
export interface ContentRepository {
  listSyllabi(locale?: string): Promise<Syllabus[]>
  /** The tree itself is translated too, so the navigator is not English inside an Arabic page. */
  getSyllabus(id: SyllabusId, locale?: string): Promise<Syllabus | null>
  /** Every topic across every syllabus, keyed by qualified id — the graph works on this. */
  allTopics(): Promise<Map<TopicId, Topic>>
  /**
   * `locale` is a request, not a guarantee. When no translation exists the default is returned
   * and `servedLocale` says so, which is what lets the UI be honest about it instead of silently
   * showing the wrong language.
   */
  getLesson(topicId: TopicId, locale?: string): Promise<Lesson | null>
  getExercises(topicId: TopicId, locale?: string): Promise<Exercise[]>
  getGlossary(syllabusId: SyllabusId): Promise<GlossaryEntry[]>
}
