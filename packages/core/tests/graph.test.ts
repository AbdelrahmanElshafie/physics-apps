import { describe, expect, it } from 'vitest'

import {
  buildSyllabus,
  findGraphIssues,
  syllabusFileSchema,
  topologicalOrder,
  type SyllabusFile,
} from '../src/domain'

/**
 * Ported from physics-instructor's original graph.test.ts, scoped to only what actually lives in
 * this package now. The prerequisite graph is the piece most likely to break quietly — a bad
 * `requires` edge locks a topic forever with no error — so it is worth its own subject-agnostic
 * test here, run once for every app that depends on this package rather than once per app.
 */

function syllabus(topics: { id: string; requires?: string[] }[]): SyllabusFile {
  return syllabusFileSchema.parse({
    schemaVersion: 1,
    id: 'test',
    title: 'Test syllabus',
    phases: [
      {
        id: 'p1',
        title: 'Phase 1',
        modules: [
          {
            id: 'm1',
            title: 'Module 1',
            topics: topics.map((t) => ({ title: t.id, ...t })),
          },
        ],
      },
    ],
  })
}

describe('findGraphIssues', () => {
  it('finds no issues in a clean chain', () => {
    const s = buildSyllabus(syllabus([{ id: 'a' }, { id: 'b', requires: ['a'] }]))
    expect(findGraphIssues(s.topics)).toEqual([])
  })

  it('reports a dangling prerequisite', () => {
    const s = buildSyllabus(syllabus([{ id: 'a', requires: ['ghost'] }]))
    const issues = findGraphIssues(s.topics)
    expect(issues).toHaveLength(1)
    expect(issues[0]!.kind).toBe('missing-prerequisite')
  })

  it('detects a direct cycle', () => {
    const s = buildSyllabus(syllabus([{ id: 'a', requires: ['b'] }, { id: 'b', requires: ['a'] }]))
    const issues = findGraphIssues(s.topics)
    expect(issues.some((i) => i.kind === 'cycle')).toBe(true)
  })

  it('detects a longer cycle and reports it once', () => {
    const s = buildSyllabus(
      syllabus([
        { id: 'a', requires: ['c'] },
        { id: 'b', requires: ['a'] },
        { id: 'c', requires: ['b'] },
      ]),
    )
    const issues = findGraphIssues(s.topics).filter((i) => i.kind === 'cycle')
    expect(issues).toHaveLength(1)
  })
})

describe('topologicalOrder', () => {
  it('places every prerequisite before its dependent', () => {
    const s = buildSyllabus(
      syllabus([
        { id: 'c', requires: ['b'] },
        { id: 'a' },
        { id: 'b', requires: ['a'] },
      ]),
    )
    const order = topologicalOrder(s.topics).map((id) => id.split(':')[1])
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'))
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'))
  })

  it('still places every topic even inside a cycle', () => {
    const s = buildSyllabus(syllabus([{ id: 'a', requires: ['b'] }, { id: 'b', requires: ['a'] }]))
    expect(topologicalOrder(s.topics)).toHaveLength(2)
  })
})
