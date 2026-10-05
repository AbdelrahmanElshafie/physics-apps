import fs from 'node:fs/promises'
import path from 'node:path'

import {
  learningEventSchema,
  parseEventLine,
  reduceEvents,
  type LearningEvent,
  type ProgressState,
} from '@core/domain'
import type { ProgressRepository } from '@core/ports'

const DEFAULT_LOG = path.join(process.cwd(), 'data', 'events.jsonl')

/**
 * Append-only JSONL progress store.
 *
 * One event per line, so appending is a single `appendFile` with no read-modify-write window, the
 * log stays greppable, and I can grade an exercise from the terminal by adding a line.
 *
 * A malformed line is reported but does not take down the app: the log is hand-editable by design,
 * and losing all history to one bad line would be the worse failure.
 */
export class FileSystemProgressRepository implements ProgressRepository {
  private cache: { size: number; mtimeMs: number; state: ProgressState } | null = null

  constructor(private readonly logPath: string = DEFAULT_LOG) {}

  async append(event: LearningEvent): Promise<void> {
    // Validate before writing — a bad line would otherwise poison every later read. A validation
    // failure is a real programming error and still throws; only the filesystem write below is
    // treated as something that can legitimately fail at runtime.
    const validated = learningEventSchema.parse(event)
    try {
      await fs.mkdir(path.dirname(this.logPath), { recursive: true })
      await fs.appendFile(this.logPath, `${JSON.stringify(validated)}\n`, 'utf8')
      this.cache = null
    } catch (cause) {
      // A read-only filesystem (a serverless deployment, for instance — this app's own writable
      // `data/` only exists in local dev) must not turn "mark this lesson viewed" into a 500 on
      // every single page load. Progress just doesn't persist there; the event is logged and
      // dropped, the same tolerant-of-a-bad-write spirit as `read()`'s malformed-line handling.
      console.warn(`[progress] Could not persist event to ${this.logPath} — ${(cause as Error).message}`)
    }
  }

  async read(): Promise<LearningEvent[]> {
    let raw: string
    try {
      raw = await fs.readFile(this.logPath, 'utf8')
    } catch {
      return [] // No log yet is a valid empty history, not an error.
    }

    const events: LearningEvent[] = []
    const lines = raw.split(/\r?\n/)
    for (const [index, line] of lines.entries()) {
      try {
        const event = parseEventLine(line)
        if (event) events.push(event)
      } catch (cause) {
        console.warn(
          `[progress] Skipping malformed event at ${this.logPath}:${index + 1} — ${(cause as Error).message}`,
        )
      }
    }
    return events
  }

  async state(): Promise<ProgressState> {
    // Cache on (size, mtime): cheap to check, and changes whenever a line is appended.
    try {
      const stat = await fs.stat(this.logPath)
      if (this.cache && this.cache.size === stat.size && this.cache.mtimeMs === stat.mtimeMs) {
        return this.cache.state
      }
      const state = reduceEvents(await this.read())
      this.cache = { size: stat.size, mtimeMs: stat.mtimeMs, state }
      return state
    } catch {
      return reduceEvents([])
    }
  }
}
