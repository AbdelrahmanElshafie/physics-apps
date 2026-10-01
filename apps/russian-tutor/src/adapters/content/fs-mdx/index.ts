import fs from 'node:fs/promises'
import { parse as parseYaml } from 'yaml'

import {
  buildSyllabus,
  exerciseFileSchema,
  glossaryFileSchema,
  lessonFrontmatterSchema,
  parseTopicId,
  syllabusFileSchema,
  type Exercise,
  type GlossaryEntry,
  type Lesson,
  type Syllabus,
  type SyllabusId,
  type Topic,
  type TopicId,
} from '@core/domain'
import type { ContentRepository } from '@core/ports'

import { splitFrontmatter } from './frontmatter'
import { CONTENT_ROOT, exerciseFile, glossaryFile, lessonFile, syllabusFile } from './paths'

/** This app is English-only (its subject is Russian, not its interface), so `locale` is fixed. */
const LOCALE = 'en'

/**
 * Filesystem content repository — the same shape the physics apps use, minus the locale-fallback
 * machinery neither of those need either.
 *
 * Reads `content/syllabi/<id>/…` on demand; a syllabus is discovered by its folder existing, not
 * registered anywhere, so adding one is adding a folder.
 */
export class FileSystemContentRepository implements ContentRepository {
  private readonly syllabusCache = new Map<string, CacheEntry<Syllabus>>()
  private readonly lessonCache = new Map<string, CacheEntry<Lesson>>()
  private readonly exerciseCache = new Map<string, CacheEntry<Exercise[]>>()
  private readonly glossaryCache = new Map<string, CacheEntry<GlossaryEntry[]>>()

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

  async getLesson(topicId: TopicId): Promise<Lesson | null> {
    const { syllabus, local } = parseTopicId(topicId)
    return this.cached(this.lessonCache, lessonFile(syllabus, local), (raw) => {
      const { data, body } = splitFrontmatter(raw)
      return {
        topicId,
        frontmatter: lessonFrontmatterSchema.parse(data),
        body,
        servedLocale: LOCALE,
      }
    })
  }

  async getExercises(topicId: TopicId): Promise<Exercise[]> {
    const { syllabus, local } = parseTopicId(topicId)
    const parsed = await this.cached(this.exerciseCache, exerciseFile(syllabus, local), (raw) =>
      exerciseFileSchema.parse(parseYaml(raw)).exercises,
    )
    return parsed ?? []
  }

  async getGlossary(syllabusId: SyllabusId): Promise<GlossaryEntry[]> {
    const parsed = await this.cached(this.glossaryCache, glossaryFile(syllabusId), (raw) =>
      glossaryFileSchema.parse(parseYaml(raw)).entries,
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

interface CacheEntry<T> {
  mtimeMs: number
  value: T
}
