import fs from 'node:fs/promises'
import { watch, type FSWatcher } from 'node:fs'
import path from 'node:path'
import { ulid } from 'ulid'
import { z } from 'zod'

import type { MessageId, ThreadId } from '@physics/core/domain'
import type {
  OutboundMessage,
  TutorCapabilities,
  TutorEvent,
  TutorMessage,
  TutorTransport,
  Unsubscribe,
} from '@physics/core/ports'

import { threadDir } from './bridge-paths'

/**
 * The Claude Code tutor bridge.
 *
 * A question becomes `<ulid>.request.json` in the thread's directory, under a root directory the
 * caller supplies. The instructor reads it in the terminal with `pnpm tutor`, writes
 * `<ulid>.response.json` next to it, and a directory watcher pushes that through the SSE route to
 * the open page — so a reply appears without a refresh.
 *
 * Latency is honestly declared as `deferred`: the UI shows "queued for your instructor" rather
 * than a typing indicator, because a human answers these. An API-backed adapter would declare
 * `interactive` and `streaming`, and the same components switch behaviour on their own.
 */

const contextSchema = z.object({
  topicId: z.string().optional(),
  exerciseId: z.string().optional(),
  equationLatex: z.string().optional(),
  equationLabel: z.string().optional(),
  draftAnswer: z.string().optional(),
})

const bridgeMessageSchema = z.object({
  v: z.literal(1),
  id: z.string().min(1),
  threadId: z.string().min(1),
  role: z.enum(['learner', 'tutor']),
  body: z.string(),
  ts: z.string(),
  context: contextSchema.default({}),
  /** On a response, the id of the request it answers. */
  answers: z.string().optional(),
})

export type BridgeMessage = z.infer<typeof bridgeMessageSchema>

const REQUEST_SUFFIX = '.request.json'
const RESPONSE_SUFFIX = '.response.json'

export class ClaudeCodeTutorTransport implements TutorTransport {
  readonly id = 'claude-code' as const

  readonly capabilities: TutorCapabilities = {
    streaming: false,
    latency: 'deferred',
    awareOfProgress: false,
  }

  private readonly root: string

  constructor(root: string = path.join(process.cwd(), 'data', 'bridge', 'threads')) {
    this.root = root
  }

  async send(message: OutboundMessage): Promise<MessageId> {
    const dir = threadDir(this.root, message.threadId)
    await fs.mkdir(dir, { recursive: true })

    const id = ulid()
    const payload: BridgeMessage = {
      v: 1,
      id,
      threadId: message.threadId,
      role: 'learner',
      body: message.body,
      ts: new Date().toISOString(),
      context: message.context,
    }

    await writeAtomic(path.join(dir, `${id}${REQUEST_SUFFIX}`), payload)
    return id as MessageId
  }

  async history(threadId: ThreadId): Promise<TutorMessage[]> {
    const messages = await readThread(threadDir(this.root, threadId))
    const answered = answeredIds(messages)

    return messages
      .map((m) => toTutorMessage(m, threadId, answered))
      .sort((a, b) => a.ts.localeCompare(b.ts))
  }

  subscribe(threadId: ThreadId, listener: (event: TutorEvent) => void): Unsubscribe {
    const dir = threadDir(this.root, threadId)
    const seen = new Set<string>()
    let watcher: FSWatcher | null = null
    let closed = false
    let timer: NodeJS.Timeout | null = null

    const scan = async () => {
      if (closed) return
      try {
        const messages = await readThread(dir)
        const answered = answeredIds(messages)

        for (const raw of messages.sort((a, b) => a.ts.localeCompare(b.ts))) {
          // A queued question becomes a different state once answered, so the key covers both.
          const key = `${raw.id}:${answered.has(raw.id) ? 'done' : 'open'}`
          if (seen.has(key)) continue
          seen.add(key)
          listener({ kind: 'message', message: toTutorMessage(raw, threadId, answered) })
        }
      } catch {
        // The directory may not exist until the first question — nothing to report yet.
      }
    }

    // fs.watch fires several times for a single write on some platforms; coalesce them.
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void scan(), 60)
    }

    void (async () => {
      await fs.mkdir(dir, { recursive: true }).catch(() => undefined)
      if (closed) return
      await scan()
      if (closed) return
      try {
        watcher = watch(dir, { persistent: false }, schedule)
      } catch {
        // Watching can be unavailable on some filesystems; the SSE route also polls as a backstop.
      }
    })()

    return () => {
      closed = true
      if (timer) clearTimeout(timer)
      watcher?.close()
    }
  }

  /**
   * Watches every thread belonging to one topic through a single filesystem watcher.
   *
   * Threads are named `<topicId>`, `<topicId>#<exerciseId>` and `<topicId>@<equationId>`, but the
   * directories are hashed, so the filter runs on the threadId recorded inside each file rather
   * than on the path.
   */
  subscribeTopic(topicId: string, listener: (event: TutorEvent) => void): Unsubscribe {
    const seen = new Set<string>()
    let watcher: FSWatcher | null = null
    let closed = false
    let timer: NodeJS.Timeout | null = null

    const belongs = (threadId: string) =>
      threadId === topicId || threadId.startsWith(`${topicId}#`) || threadId.startsWith(`${topicId}@`)

    const scan = async () => {
      if (closed) return
      let entries
      try {
        entries = await fs.readdir(this.root, { withFileTypes: true })
      } catch {
        return // No questions asked yet.
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const messages = await readThread(path.join(this.root, entry.name))
        if (messages.length === 0 || !belongs(messages[0]!.threadId)) continue

        const answered = answeredIds(messages)
        for (const raw of messages.sort((a, b) => a.ts.localeCompare(b.ts))) {
          const key = `${raw.id}:${answered.has(raw.id) ? 'done' : 'open'}`
          if (seen.has(key)) continue
          seen.add(key)
          listener({
            kind: 'message',
            message: toTutorMessage(raw, raw.threadId as ThreadId, answered),
          })
        }
      }
    }

    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void scan(), 80)
    }

    void (async () => {
      await fs.mkdir(this.root, { recursive: true }).catch(() => undefined)
      if (closed) return
      await scan()
      if (closed) return
      try {
        // Recursive so a brand-new thread directory is picked up, not just writes into known ones.
        watcher = watch(this.root, { persistent: false, recursive: true }, schedule)
      } catch {
        try {
          watcher = watch(this.root, { persistent: false }, schedule)
        } catch {
          // Watching unavailable; the client reconnect still refreshes the thread.
        }
      }
    })()

    return () => {
      closed = true
      if (timer) clearTimeout(timer)
      watcher?.close()
    }
  }

  /** Every question still waiting on a reply, across all threads. This is what `pnpm tutor` lists. */
  async pending(): Promise<{ request: BridgeMessage; dir: string }[]> {
    let dirs: string[]
    try {
      dirs = (await fs.readdir(this.root, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => path.join(this.root, e.name))
    } catch {
      return []
    }

    const out: { request: BridgeMessage; dir: string }[] = []
    for (const dir of dirs) {
      const messages = await readThread(dir)
      const answered = answeredIds(messages)
      for (const m of messages) {
        if (m.role === 'learner' && !answered.has(m.id)) out.push({ request: m, dir })
      }
    }
    return out.sort((a, b) => a.request.ts.localeCompare(b.request.ts))
  }

  /** Writes a reply. Used by the tutor CLI so the instructor never hand-authors a bridge file. */
  async reply(input: { threadId: string; answers: string; body: string }): Promise<MessageId> {
    const dir = threadDir(this.root, input.threadId)
    await fs.mkdir(dir, { recursive: true })

    const id = ulid()
    const payload: BridgeMessage = {
      v: 1,
      id,
      threadId: input.threadId,
      role: 'tutor',
      body: input.body,
      ts: new Date().toISOString(),
      context: {},
      answers: input.answers,
    }

    await writeAtomic(path.join(dir, `${id}${RESPONSE_SUFFIX}`), payload)
    return id as MessageId
  }
}

/** Write to a temp name then rename, so a watcher never observes a half-written file. */
async function writeAtomic(target: string, payload: BridgeMessage): Promise<void> {
  const temp = `${target}.tmp`
  await fs.writeFile(temp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await fs.rename(temp, target)
}

function answeredIds(messages: readonly BridgeMessage[]): Set<string> {
  const ids = new Set<string>()
  for (const m of messages) {
    if (m.answers) ids.add(m.answers)
  }
  return ids
}

async function readThread(dir: string): Promise<BridgeMessage[]> {
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }

  const messages: BridgeMessage[] = []
  for (const name of names) {
    if (!name.endsWith(REQUEST_SUFFIX) && !name.endsWith(RESPONSE_SUFFIX)) continue
    try {
      const raw = await fs.readFile(path.join(dir, name), 'utf8')
      messages.push(bridgeMessageSchema.parse(JSON.parse(raw)))
    } catch (cause) {
      console.warn(`[tutor] Ignoring unreadable bridge file ${name}: ${(cause as Error).message}`)
    }
  }
  return messages
}

function toTutorMessage(
  raw: BridgeMessage,
  threadId: ThreadId,
  answered: ReadonlySet<string>,
): TutorMessage {
  const isOpenQuestion = raw.role === 'learner' && !answered.has(raw.id)
  return {
    id: raw.id as MessageId,
    threadId,
    role: raw.role,
    body: raw.body,
    ts: raw.ts,
    // Bridge files store plain strings; the branded types are a compile-time concern only.
    context: raw.context as TutorMessage['context'],
    ...(isOpenQuestion ? { pending: true } : {}),
  }
}
