import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FileSystemScratchpadRepository } from '../src/fs-repository'

describe('FileSystemScratchpadRepository', () => {
  let root: string
  let repo: FileSystemScratchpadRepository

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'scratchpad-test-'))
    repo = new FileSystemScratchpadRepository(root)
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('list() on an empty (even non-existent) root returns an empty array, not an error', async () => {
    expect(await repo.list()).toEqual([])
  })

  it('round-trips a saved pad through get()', async () => {
    const pad = {
      schemaVersion: 1 as const,
      id: 'pad1',
      title: 'Derivation practice',
      steps: [{ id: 's1', latex: 'x = 1' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    await repo.save(pad)
    expect(await repo.get('pad1')).toEqual(pad)
  })

  it('list() sorts by updatedAt descending', async () => {
    await repo.save({
      schemaVersion: 1,
      id: 'older',
      title: 'Older',
      steps: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await repo.save({
      schemaVersion: 1,
      id: 'newer',
      title: 'Newer',
      steps: [],
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
    const list = await repo.list()
    expect(list.map((p) => p.id)).toEqual(['newer', 'older'])
  })

  it('remove() deletes a pad; get() then returns null', async () => {
    await repo.save({
      schemaVersion: 1,
      id: 'gone',
      title: 'Gone',
      steps: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await repo.remove('gone')
    expect(await repo.get('gone')).toBeNull()
  })

  it('rejects an unsafe id rather than escaping the root directory', async () => {
    await expect(repo.get('../../etc/passwd')).rejects.toThrow(/Unsafe scratchpad id/)
  })
})
