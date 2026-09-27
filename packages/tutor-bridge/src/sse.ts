import { asThreadId } from '@physics/core/domain'
import type { TutorEvent, TutorTransport } from '@physics/core/ports'

/**
 * Server-sent events for a tutor conversation, as a standard Web `Response` — a Next.js Route
 * Handler (or any other fetch-API-based server) can return this directly.
 *
 * `{ topic }` streams every thread belonging to that topic — a rail's conversation plus one per
 * exercise or equation. `{ thread }` streams a single thread.
 *
 * A page uses the topic form and fans the messages out on the client, because a browser allows
 * only a handful of concurrent connections per origin: one stream per exercise card saturates the
 * pool and stalls ordinary navigation and form posts. See `react/TutorStream.tsx`.
 *
 * SSE rather than WebSockets because traffic is one-directional — questions go out over a server
 * action, only replies come back — and SSE reconnects by itself when the dev server restarts,
 * which it does constantly while authoring.
 */

const HEARTBEAT_MS = 25_000

export function createTutorSSEStream(
  tutor: TutorTransport,
  scope: { topic?: string | null; thread?: string | null },
  options?: { signal?: AbortSignal },
): Response {
  if (!scope.topic && !scope.thread) {
    return new Response('Provide either a "topic" or a "thread" query parameter.', { status: 400 })
  }

  const encoder = new TextEncoder()

  // Declared outside `start()` so `cancel()` (called when the client disconnects) can reach it —
  // the standard Web Streams way to detect disconnect, framework-agnostic unlike NextRequest.signal.
  let cleanup = () => {}

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
      // waiting state — a queued badge for the file bridge, a token stream for an API-backed one.
      send('ready', { transport: tutor.id, capabilities: tutor.capabilities })

      const onEvent = (event: TutorEvent) => {
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

      const unsubscribe = scope.topic
        ? tutor.subscribeTopic(scope.topic, onEvent)
        : tutor.subscribe(asThreadId(scope.thread!), onEvent)

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

      cleanup = () => {
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
    },
    cancel() {
      cleanup()
    },
  })

  options?.signal?.addEventListener('abort', () => cleanup())

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
