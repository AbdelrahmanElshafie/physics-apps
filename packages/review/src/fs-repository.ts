import fs from 'node:fs/promises'
import path from 'node:path'

import { parseReviewEventLine, reduceReviewEvents, reviewEventSchema, type ReviewEvent, type ReviewState } from './events'
import type { ReviewRepository } from './repository'

const DEFAULT_LOG = () => path.join(process.cwd(), 'data', 'review', 'events.jsonl')

/**
 * Append-only JSONL review store — the same technique as the progress log: one event per line, so
 * appending is a single `appendFile` with no read-modify-write window, and a malformed line is
 * reported but never takes down the whole log.
 */
export class FileSystemReviewRepository implements ReviewRepository {
  private readonly logPath: string
  private cache: { size: number; mtimeMs: number; state: ReviewState } | null = null

  constructor(logPath: string = DEFAULT_LOG()) {
    this.logPath = logPath
  }

  async append(event: ReviewEvent): Promise<void> {
    const validated = reviewEventSchema.parse(event)
    await fs.mkdir(path.dirname(this.logPath), { recursive: true })
    await fs.appendFile(this.logPath, `${JSON.stringify(validated)}\n`, 'utf8')
    this.cache = null
  }

  async read(): Promise<ReviewEvent[]> {
    let raw: string
    try {
      raw = await fs.readFile(this.logPath, 'utf8')
    } catch {
      return [] // No log yet is a valid empty history, not an error.
    }

    const events: ReviewEvent[] = []
    const lines = raw.split(/\r?\n/)
    for (const [index, line] of lines.entries()) {
      try {
        const event = parseReviewEventLine(line)
        if (event) events.push(event)
      } catch (cause) {
        console.warn(
          `[review] Skipping malformed event at ${this.logPath}:${index + 1} — ${(cause as Error).message}`,
        )
      }
    }
    return events
  }

  async state(): Promise<ReviewState> {
    try {
      const stat = await fs.stat(this.logPath)
      if (this.cache && this.cache.size === stat.size && this.cache.mtimeMs === stat.mtimeMs) {
        return this.cache.state
      }
      const state = reduceReviewEvents(await this.read())
      this.cache = { size: stat.size, mtimeMs: stat.mtimeMs, state }
      return state
    } catch {
      return reduceReviewEvents([])
    }
  }
}
