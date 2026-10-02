import fs from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'

import { reviewDeckFileSchema, type ReviewCard } from '@physics/review'
import { parseTopicId, type TopicId } from '@core/domain'
import type { ReviewContentPort } from '@core/ports'

import { CONTENT_ROOT, reviewFile } from './paths'

/**
 * Reads `content/syllabi/<syllabus>/review/<topicId>.yaml` — the fourth content file per topic,
 * alongside `lessons/*.mdx` and `exercises/*.yaml`. A topic with no review file simply has no
 * cards yet, the same "folder existing is the only registration" rule `FileSystemContentRepository`
 * already uses for syllabi.
 */
export class FileSystemReviewContentRepository implements ReviewContentPort {
  private readonly cache = new Map<string, { mtimeMs: number; cards: ReviewCard[] }>()

  async getDeck(topicId: string): Promise<ReviewCard[]> {
    const { syllabus, local } = parseTopicId(topicId as TopicId)
    return this.readDeck(reviewFile(syllabus, local))
  }

  async allDecks(): Promise<ReviewCard[]> {
    let syllabusDirs: string[]
    try {
      syllabusDirs = (await fs.readdir(CONTENT_ROOT, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    } catch {
      return []
    }

    const all: ReviewCard[] = []
    for (const syllabusId of syllabusDirs) {
      const dir = path.join(CONTENT_ROOT, syllabusId, 'review')
      let files: string[]
      try {
        files = await fs.readdir(dir)
      } catch {
        continue // No review/ folder yet for this syllabus is fine, not an error.
      }
      for (const file of files) {
        if (!file.endsWith('.yaml')) continue
        all.push(...(await this.readDeck(path.join(dir, file))))
      }
    }
    return all
  }

  private async readDeck(file: string): Promise<ReviewCard[]> {
    let mtimeMs: number
    try {
      mtimeMs = (await fs.stat(file)).mtimeMs
    } catch {
      return []
    }

    const hit = this.cache.get(file)
    if (hit && hit.mtimeMs === mtimeMs) return hit.cards

    const raw = await fs.readFile(file, 'utf8')
    try {
      const parsed = reviewDeckFileSchema.parse(parseYaml(raw))
      this.cache.set(file, { mtimeMs, cards: parsed.cards })
      return parsed.cards
    } catch (cause) {
      throw new Error(`Failed to parse review deck: ${file}\n${(cause as Error).message}`, { cause })
    }
  }
}
