import type { Exercise } from '../domain/exercise'
import type { GlossaryEntry } from '../domain/lesson'
import type { Lesson } from '../domain/lesson'
import type { SyllabusId, TopicId } from '../domain/ids'
import type { Syllabus } from '../domain/syllabus'

/**
 * Read access to authored content.
 *
 * Implemented today by the filesystem adapter reading `content/syllabi/**`. A SQLite or CMS
 * implementation (M5) satisfies the same interface, so nothing above this line changes.
 */
export interface ContentRepository {
  listSyllabi(): Promise<Syllabus[]>
  getSyllabus(id: SyllabusId): Promise<Syllabus | null>
  /** Every topic across every syllabus, keyed by qualified id — the graph works on this. */
  allTopics(): Promise<Map<TopicId, import('../domain/syllabus').Topic>>
  getLesson(topicId: TopicId): Promise<Lesson | null>
  getExercises(topicId: TopicId): Promise<Exercise[]>
  getGlossary(syllabusId: SyllabusId): Promise<GlossaryEntry[]>
}
