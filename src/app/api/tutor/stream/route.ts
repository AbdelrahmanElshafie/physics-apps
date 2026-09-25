import type { NextRequest } from 'next/server'

import { asThreadId } from '@core/domain'
import { container } from '@/container'

/**
 * Server-sent events for a tutor conversation.
 *
 * `?topic=<topicId>` streams every thread belonging to that topic — the rail's conversation plus
 * one per exercise or equation. `?thread=<threadId>` streams a single thread.
 *
 * A page uses the topic form and fans the messages out on the client, because a browser allows
 * only a handful of concurrent connections per origin: one stream per exercise card saturates the
 * pool and stalls ordinary navigation and form posts.
 *
 * SSE rather than WebSockets because traffic is one-directional — questions go out over a server
 * action, only replies come back — and SSE reconnects by itself when the dev server restarts,
 * which it does constantly while authoring.
 */

export const dynamic = 'force-dynamic'
// Node runtime required: the transport watches the filesystem, which the edge runtime cannot do.
export const runtime = 'nodejs'

const HEARTBEAT_MS = 25_000

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get('topic')
  const thread = request.nextUrl.searchParams.get('thread')

  if (!topic && !thread) {
    return new Response('Provide either a "topic" or a "thread" query parameter.', { status: 400 })
  }

  const { tutor } = container()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true

      const send = (event: string, data: unknown) => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          // The client vanished between the check and the write; treat it as closed.
          open = false
        }
      }

      // Tell the client what kind of tutor is on the other end, so it can render an honest
      // waiting state — a queued badge for the file bridge, a token stream for the API later.
      send('ready', { transport: tutor.id, capabilities: tutor.capabilities })

      const onEvent = (event: Parameters<Parameters<typeof tutor.subscribe>[1]>[0]) => {
        if (event.kind === 'message') {
          send('message', {
            id: String(event.message.id),
            // Included so a topic-scoped stream can be routed to the right card on the client.
            threadId: String(event.message.threadId),
            role: event.message.role,
            body: event.message.body,
            ts: event.message.ts,
            pending: event.message.pending ?? false,
            context: event.message.context ?? {},
          })
        } else if (event.kind === 'delta') {
          send('delta', { id: String(event.messageId), text: event.text })
        } else {
          send('status', { id: String(event.messageId), status: event.status })
        }
      }

      const unsubscribe = topic
        ? tutor.subscribeTopic(topic, onEvent)
        : tutor.subscribe(asThreadId(thread!), onEvent)

      // Proxies and browsers drop idle connections; a comment frame keeps it warm without
      // registering as an event on the client.
      const heartbeat = setInterval(() => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'))
        } catch {
          open = false
        }
      }, HEARTBEAT_MS)

      const cleanup = () => {
        if (!open) return
        open = false
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // Already closed by the runtime.
        }
      }

      request.signal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disables proxy buffering, which would otherwise hold events until the buffer fills.
      'X-Accel-Buffering': 'no',
    },
  })
}
