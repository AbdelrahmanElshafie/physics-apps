import { createHash } from 'node:crypto'
import path from 'node:path'

/**
 * Thread ids are semantic (`nuclear-physics:m1.1-vector-spaces#q7a`) so a follow-up about the same
 * exercise lands in the same conversation. But the ":", "#" and "@" characters are not usable in
 * Windows paths, so the directory name is a readable slug plus a short hash of the original id —
 * readable enough for the instructor to recognise in a terminal, unique enough not to collide.
 */
export function threadDirName(threadId: string): string {
  const slug = threadId
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const hash = createHash('sha1').update(threadId).digest('hex').slice(0, 8)
  return `${slug || 'thread'}--${hash}`
}

export function threadDir(root: string, threadId: string): string {
  return path.join(root, threadDirName(threadId))
}
