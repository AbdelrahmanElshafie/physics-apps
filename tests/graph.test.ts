import { describe, expect, it } from 'vitest'

import { buildSyllabus, findGraphIssues, topologicalOrder, syllabusFileSchema } from '@core/domain'
import type { SyllabusFile } from '@core/domain'

/**
 * The prerequisite graph is the piece most likely to break quietly: a bad `requires` edge locks a
 * topic forever with no error. These tests run against the pure domain, so no filesystem, no
 * server and no mocks are involved.
 */

function syllabus(topics: { id: string; requires?: string[] }[]): SyllabusFile {
  return syllabusFileSchema.parse({
    schemaVersion: 1,
    id: 'test',
    title: 'Test',
    phases: [
      {
        id: 'p1',
        title: 'Phase 1',
        modules: [
          {
            id: 'm1',
            title: 'Module 1',
            topics: topics.map((t) => ({
              id: t.id,
              title: t.id,
              ...(t.requires ? { requires: t.requires } : {}),
            })),
          },
        ],
      },
    ],
  })
}

describe('buildSyllabus', () => {
  it('namespaces topic ids by syllabus', () => {
    const built = buildSyllabus(syllabus([{ id: 'a' }]))
    expect([...built.topics.keys()]).toEqual(['test:a'])
  })

  it('resolves bare prerequisite refs within the same syllabus', () => {
    const built = buildSyllabus(syllabus([{ id: 'a' }, { id: 'b', requires: ['a'] }]))
    expect(built.topics.get('test:b' as never)?.requires).toEqual(['test:a'])
  })

  it('leaves already-qualified cross-syllabus refs alone', () => {
    const built = buildSyllabus(syllabus([{ id: 'a', requires: ['other:x'] }]))
    expect(built.topics.get('test:a' as never)?.requires).toEqual(['other:x'])
  })

  it('rejects duplicate topic ids rather than silently dropping one', () => {
    expect(() => buildSyllabus(syllabus([{ id: 'a' }, { id: 'a' }]))).toThrow(/Duplicate topic id/)
  })

  it('records authored reading order', () => {
    const built = buildSyllabus(syllabus([{ id: 'a' }, { id: 'b' }, { id: 'c' }]))
    expect(built.order).toEqual(['test:a', 'test:b', 'test:c'])
  })
})

describe('findGraphIssues', () => {
  it('accepts a clean chain', () => {
    const built = buildSyllabus(
      syllabus([{ id: 'a' }, { id: 'b', requires: ['a'] }, { id: 'c', requires: ['b'] }]),
    )
    expect(findGraphIssues(built.topics)).toEqual([])
  })

  it('detects a direct cycle', () => {
    const built = buildSyllabus(
      syllabus([
        { id: 'a', requires: ['b'] },
        { id: 'b', requires: ['a'] },
      ]),
    )
    const cycles = findGraphIssues(built.topics).filter((i) => i.kind === 'cycle')
    expect(cycles).toHaveLength(1)
    expect(cycles[0]?.detail).toMatch(/Prerequisite cycle/)
  })

  it('reports a cycle once, not once per entry point', () => {
    const built = buildSyllabus(
      syllabus([
        { id: 'a', requires: ['c'] },
        { id: 'b', requires: ['a'] },
        { id: 'c', requires: ['b'] },
      ]),
    )
    expect(findGraphIssues(built.topics).filter((i) => i.kind === 'cycle')).toHaveLength(1)
  })

  it('flags a prerequisite that does not exist', () => {
    const built = buildSyllabus(syllabus([{ id: 'a', requires: ['ghost'] }]))
    const missing = findGraphIssues(built.topics).filter((i) => i.kind === 'missing-prerequisite')
    expect(missing).toHaveLength(1)
    expect(missing[0]?.detail).toMatch(/does not exist/)
  })

  it('does not treat a diamond as a cycle', () => {
    const built = buildSyllabus(
      syllabus([
        { id: 'a' },
        { id: 'b', requires: ['a'] },
        { id: 'c', requires: ['a'] },
        { id: 'd', requires: ['b', 'c'] },
      ]),
    )
    expect(findGraphIssues(built.topics).filter((i) => i.kind === 'cycle')).toEqual([])
  })
})

describe('topologicalOrder', () => {
  it('places prerequisites before dependents', () => {
    const built = buildSyllabus(
      syllabus([
        { id: 'c', requires: ['b'] },
        { id: 'b', requires: ['a'] },
        { id: 'a' },
      ]),
    )
    expect(topologicalOrder(built.topics)).toEqual(['test:a', 'test:b', 'test:c'])
  })

  it('breaks ties by authored order so output is stable', () => {
    const built = buildSyllabus(syllabus([{ id: 'a' }, { id: 'b' }, { id: 'c' }]))
    expect(topologicalOrder(built.topics)).toEqual(['test:a', 'test:b', 'test:c'])
  })

  it('still returns every topic when a cycle is present', () => {
    const built = buildSyllabus(
      syllabus([
        { id: 'a', requires: ['b'] },
        { id: 'b', requires: ['a'] },
        { id: 'c' },
      ]),
    )
    expect(topologicalOrder(built.topics).sort()).toEqual(['test:a', 'test:b', 'test:c'])
  })
})
