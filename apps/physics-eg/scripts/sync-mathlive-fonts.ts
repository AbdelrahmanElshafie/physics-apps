import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Copies MathLive's font files into `public/mathlive/fonts`.
 *
 * MathLive otherwise fetches them from a CDN at runtime, which would make the scratchpad's editor
 * render incorrectly offline. Runs from `predev`/`prebuild` so a version bump cannot leave stale
 * fonts behind, and skips silently when nothing has changed.
 */

const source = path.join(process.cwd(), 'node_modules', 'mathlive', 'fonts')
const target = path.join(process.cwd(), 'public', 'mathlive', 'fonts')

async function main(): Promise<void> {
  let names: string[]
  try {
    names = await fs.readdir(source)
  } catch {
    console.warn('[fonts] mathlive is not installed yet — skipping font sync.')
    return
  }

  await fs.mkdir(target, { recursive: true })

  let copied = 0
  for (const name of names) {
    const from = path.join(source, name)
    const to = path.join(target, name)

    const [src, dest] = await Promise.all([fs.stat(from), fs.stat(to).catch(() => null)])
    if (dest && dest.size === src.size && dest.mtimeMs >= src.mtimeMs) continue

    await fs.copyFile(from, to)
    copied += 1
  }

  console.log(
    copied === 0
      ? `[fonts] ${names.length} MathLive fonts already up to date.`
      : `[fonts] Copied ${copied} MathLive font file(s) to public/mathlive/fonts.`,
  )
}

main().catch((error: unknown) => {
  console.error('[fonts] Sync failed:', error)
  process.exitCode = 1
})
