import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The architecture boundary, enforced.
 *
 * The plan's central claim is that swapping the tutor from the Claude Code bridge to the Anthropic
 * API is one adapter. That only stays true while `core/` depends on nothing environmental. A lint
 * rule covers this too, but lint rules get disabled inline; this test reads the source and is much
 * harder to wave away.
 */

const CORE = path.join(process.cwd(), 'src', 'core')

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return sourceFiles(full)
      return entry.name.endsWith('.ts') ? [full] : []
    }),
  )
  return files.flat()
}

/** Every module specifier in a file, from both static and dynamic imports. */
function importsOf(source: string): string[] {
  const specifiers: string[] = []
  const patterns = [
    /import\s+(?:type\s+)?[^'"]*from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1])
    }
  }
  return specifiers
}

const FORBIDDEN: { test: (spec: string) => boolean; reason: string }[] = [
  { test: (s) => s === 'next' || s.startsWith('next/'), reason: 'Next.js' },
  { test: (s) => s === 'react' || s === 'react-dom' || s.startsWith('react/'), reason: 'React' },
  { test: (s) => s.startsWith('node:'), reason: 'Node built-ins' },
  { test: (s) => ['fs', 'path', 'os', 'crypto', 'child_process'].includes(s), reason: 'Node built-ins' },
  { test: (s) => s.includes('adapters'), reason: 'adapters' },
  { test: (s) => s.includes('components') || s.includes('/app/'), reason: 'UI' },
  { test: (s) => ['yaml', 'katex', 'mathlive', 'zustand', 'ulid'].includes(s), reason: 'infrastructure libraries' },
]

describe('core purity', () => {
  it('has source files to check', async () => {
    expect((await sourceFiles(CORE)).length).toBeGreaterThan(5)
  })

  it('never imports framework, Node, adapters or UI', async () => {
    const files = await sourceFiles(CORE)
    const violations: string[] = []

    for (const file of files) {
      const source = await fs.readFile(file, 'utf8')
      const relative = path.relative(process.cwd(), file)

      for (const specifier of importsOf(source)) {
        // Relative imports inside core are the intended way to compose it.
        if (specifier.startsWith('.')) continue

        const rule = FORBIDDEN.find((r) => r.test(specifier))
        if (rule) {
          violations.push(`${relative} imports "${specifier}" (${rule.reason})`)
        }
      }
    }

    // A failure here means a dependency points the wrong way. Invert it behind a port in
    // src/core/ports rather than relaxing this test.
    expect(violations).toEqual([])
  })

  it('allows zod, which is domain modelling rather than infrastructure', async () => {
    const source = await fs.readFile(path.join(CORE, 'domain', 'syllabus.ts'), 'utf8')
    expect(importsOf(source)).toContain('zod')
  })
})

describe('composition root', () => {
  it('is the only place that names a concrete adapter', async () => {
    const appDir = path.join(process.cwd(), 'src', 'app')
    const files = await sourceFiles(appDir).catch(() => [])

    const offenders: string[] = []
    for (const file of files) {
      const source = await fs.readFile(file, 'utf8')
      for (const specifier of importsOf(source)) {
        if (specifier.includes('@adapters/')) {
          offenders.push(path.relative(process.cwd(), file))
        }
      }
    }

    // Routes and actions must go through `container()`, so switching transports stays a
    // one-file change.
    expect(offenders).toEqual([])
  })
})
