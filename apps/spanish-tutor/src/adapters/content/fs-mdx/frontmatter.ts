import { parse as parseYaml } from 'yaml'

/**
 * Minimal YAML frontmatter splitter.
 *
 * A dependency (gray-matter) would do this, but it is twenty lines and avoiding it keeps the
 * MDX pipeline transparent — worth it for the one place content parsing can silently go wrong.
 */
export function splitFrontmatter(source: string): { data: unknown; body: string } {
  const normalised = source.replace(/^﻿/, '')
  if (!normalised.startsWith('---')) return { data: {}, body: normalised }

  const end = normalised.indexOf('\n---', 3)
  if (end === -1) return { data: {}, body: normalised }

  const raw = normalised.slice(3, end).trim()
  const afterFence = normalised.indexOf('\n', end + 1)
  const body = afterFence === -1 ? '' : normalised.slice(afterFence + 1)

  return { data: raw.length === 0 ? {} : parseYaml(raw), body: body.replace(/^\n+/, '') }
}
