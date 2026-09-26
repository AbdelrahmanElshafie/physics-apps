import fs from 'node:fs/promises'
import path from 'node:path'

import {
  scratchpadSchema,
  summariseScratchpad,
  type Scratchpad,
  type ScratchpadSummary,
} from '@core/domain'
import type { ScratchpadRepository } from '@core/ports'

/**
 * One JSON file per scratchpad under `data/scratch/`.
 *
 * Plain files so a piece of working is readable and greppable from the terminal — I need to be
 * able to look at what someone is stuck on without the app running.
 */
const ROOT = path.join(process.cwd(), 'data', 'scratch')

/** Ids end up in a path, so anything that could escape the directory is rejected outright. */
function assertSafeId(id: string): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    throw new Error(`Unsafe scratchpad id: ${JSON.stringify(id)}`)
  }
}

const fileFor = (id: string) => {
  assertSafeId(id)
  return path.join(ROOT, `${id}.json`)
}

export class FileSystemScratchpadRepository implements ScratchpadRepository {
  async list(): Promise<ScratchpadSummary[]> {
    let names: string[]
    try {
      names = await fs.readdir(ROOT)
    } catch {
      return [] // No scratchpads yet is an empty list, not an error.
    }

    const pads: ScratchpadSummary[] = []
    for (const name of names) {
      if (!name.endsWith('.json')) continue
      const pad = await this.read(path.join(ROOT, name))
      if (pad) pads.push(summariseScratchpad(pad))
    }

    // Most recently edited first — that is almost always what you want to reopen.
    return pads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async get(id: string): Promise<Scratchpad | null> {
    return this.read(fileFor(id))
  }

  private async read(file: string): Promise<Scratchpad | null> {
    try {
      return scratchpadSchema.parse(JSON.parse(await fs.readFile(file, 'utf8')))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`[scratch] Ignoring unreadable pad ${file}:`, (error as Error).message)
      }
      return null
    }
  }

  async save(pad: Scratchpad): Promise<void> {
    const validated = scratchpadSchema.parse(pad)
    await fs.mkdir(ROOT, { recursive: true })

    // Write then rename, so an interrupted save cannot leave a truncated file behind — this is
    // someone's working, and autosave means writes happen constantly.
    const target = fileFor(validated.id)
    const temp = `${target}.tmp`
    await fs.writeFile(temp, `${JSON.stringify(validated, null, 2)}\n`, 'utf8')
    await fs.rename(temp, target)
  }

  async remove(id: string): Promise<void> {
    await fs.rm(fileFor(id), { force: true })
  }
}
