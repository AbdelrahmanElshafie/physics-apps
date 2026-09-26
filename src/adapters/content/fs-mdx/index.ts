import fs from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'

import {
  DEFAULT_LOCALE,
  localeSuffix,
  buildSyllabus,
  exerciseFileSchema,
  glossaryFileSchema,
  lessonFrontmatterSchema,
  parseTopicId,
  syllabusFileSchema,
  type Exercise,
  type GlossaryEntry,
  type Lesson,
  type Locale,
  type Syllabus,
  type SyllabusId,
  type Topic,
  type TopicId,
} from '@core/domain'
import type { ContentRepository } from '@core/ports'

import { splitFrontmatter } from './frontmatter'
import { CONTENT_ROOT, exerciseFile, glossaryFile, lessonFile, syllabusFile } from './paths'

/**
 * Filesystem content repository.
 *
 * Reads `content/syllabi/<id>/…` on demand. Syllabi are *discovered*, not registered, so adding a
 * syllabus is adding a folder — the extensibility guarantee from the plan, enforced by the fact
 * that there is nowhere to hardcode a list.
 *
 * Caching: parsed files are memoised per process, keyed by mtime, so editing a lesson from the
 * terminal shows up on the next request without restarting the dev server.
 */

interface CacheEntry<T> {
  mtimeMs: number
  value: T
}

export class FileSystemContentRepository implements ContentRepository {
  private readonly syllabusCache = new Map<string, CacheEntry<Syllabus>>()
  private readonly lessonCache = new Map<string, CacheEntry<Lesson>>()
  private readonly exerciseCache = new Map<string, CacheEntry<Exercise[]>>()
  private readonly glossaryCache = new Map<string, CacheEntry<GlossaryEntry[]>>()

  /** Reads and parses only when the file's mtime has moved. */
  private async cached<T>(
    cache: Map<string, CacheEntry<T>>,
    file: string,
    parse: (raw: string) => T,
  ): Promise<T | null> {
    let mtimeMs: number
    try {
      mtimeMs = (await fs.stat(file)).mtimeMs
    } catch {
      return null
    }

    const hit = cache.get(file)
    if (hit && hit.mtimeMs === mtimeMs) return hit.value

    const raw = await fs.readFile(file, 'utf8')
    try {
      const value = parse(raw)
      cache.set(file, { mtimeMs, value })
      return value
    } catch (cause) {
      // Surface the offending file — a Zod error alone gives no clue which one broke.
      throw new Error(`Failed to parse content file: ${file}\n${(cause as Error).message}`, { cause })
    }
  }

  async listSyllabusIds(): Promise<SyllabusId[]> {
    let entries
    try {
      entries = await fs.readdir(CONTENT_ROOT, { withFileTypes: true })
    } catch {
      return []
    }
    const ids: SyllabusId[] = []
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      try {
        await fs.access(syllabusFile(entry.name))
        ids.push(entry.name as SyllabusId)
      } catch {
        // A folder without syllabus.yaml is work in progress, not an error.
      }
    }
    return ids.sort()
  }

  async getSyllabus(id: SyllabusId): Promise<Syllabus | null> {
    return this.cached(this.syllabusCache, syllabusFile(id), (raw) =>
      buildSyllabus(syllabusFileSchema.parse(parseYaml(raw))),
    )
  }

  async listSyllabi(): Promise<Syllabus[]> {
    const ids = await this.listSyllabusIds()
    const loaded = await Promise.all(ids.map((id) => this.getSyllabus(id)))
    return loaded.filter((s): s is Syllabus => s !== null)
  }

  async allTopics(): Promise<Map<TopicId, Topic>> {
    const all = new Map<TopicId, Topic>()
    for (const syllabus of await this.listSyllabi()) {
      for (const [id, topic] of syllabus.topics) all.set(id, topic)
    }
    return all
  }

  async getLesson(topicId: TopicId, locale: Locale = DEFAULT_LOCALE): Promise<Lesson | null> {
    const { syllabus, local } = parseTopicId(topicId)

    // Try the requested locale, then fall back to English. A missing translation must degrade to
    // readable content, never to a blank page — and the caller is told which it got.
    for (const candidate of localeCandidates(locale)) {
      const lesson = await this.cached(
        this.lessonCache,
        lessonFile(syllabus, local, localeSuffix(candidate)),
        (raw) => {
          const { data, body } = splitFrontmatter(raw)
          return {
            topicId,
            frontmatter: lessonFrontmatterSchema.parse(data),
            body,
            servedLocale: candidate,
          }
        },
      )
      if (lesson) return lesson
    }
    return null
  }

  async getExercises(topicId: TopicId, locale: Locale = DEFAULT_LOCALE): Promise<Exercise[]> {
    const { syllabus, local } = parseTopicId(topicId)

    for (const candidate of localeCandidates(locale)) {
      const parsed = await this.cached(
        this.exerciseCache,
        exerciseFile(syllabus, local, localeSuffix(candidate)),
        (raw) => exerciseFileSchema.parse(parseYaml(raw)).exercises,
      )
      if (parsed) return parsed
    }
    return []
  }

  /** Which locale a lesson would actually be served in, without loading the body. */
  async lessonLocale(topicId: TopicId, locale: Locale): Promise<Locale | null> {
    const { syllabus, local } = parseTopicId(topicId)
    for (const candidate of localeCandidates(locale)) {
      try {
        await fs.access(lessonFile(syllabus, local, localeSuffix(candidate)))
        return candidate
      } catch {
        // Try the next candidate.
      }
    }
    return null
  }

  async getGlossary(syllabusId: SyllabusId): Promise<GlossaryEntry[]> {
    const parsed = await this.cached(
      this.glossaryCache,
      glossaryFile(syllabusId),
      (raw) => glossaryFileSchema.parse(parseYaml(raw)).entries,
    )
    return parsed ?? []
  }

  /** Exercise counts for every topic — drives mastery denominators in one pass. */
  async exerciseCounts(): Promise<Map<TopicId, number>> {
    const counts = new Map<TopicId, number>()
    for (const [id] of await this.allTopics()) {
      const exercises = await this.getExercises(id)
      if (exercises.length > 0) counts.set(id, exercises.length)
    }
    return counts
  }
}

/** The requested locale first, then English as the fallback (listed once). */
function localeCandidates(locale: Locale): Locale[] {
  return locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE]
}
