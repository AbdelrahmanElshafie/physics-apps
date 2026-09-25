'use client'

import { useEffect, useState } from 'react'

/**
 * Subscribes to one tutor thread over server-sent events.
 *
 * Shared by the tutor rail and by each exercise card. An exercise submission opens its own thread
 * (`<topicId>#<exerciseId>`), so without this the card would sit there stale until a refresh while
 * my reply was already on disk — the card is exactly where the learner is looking, so that is
 * where the answer has to appear.
 */

export interface ThreadMessage {
  id: string
  role: 'learner' | 'tutor'
  body: string
  ts: string
  pending: boolean
  context?: {
    equationLatex?: string
    equationLabel?: string
    exerciseId?: string
  }
}

export interface TutorCapabilities {
  streaming: boolean
  latency: 'deferred' | 'interactive'
  awareOfProgress: boolean
}

export function useTutorThread(
  threadId: string,
  options: { enabled?: boolean } = {},
): {
  messages: ThreadMessage[]
  capabilities: TutorCapabilities | null
  connected: boolean
} {
  const enabled = options.enabled ?? true
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [capabilities, setCapabilities] = useState<TutorCapabilities | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled) return

    // Reset when the thread changes, so one exercise's replies never bleed into another's.
    setMessages([])

    const source = new EventSource(`/api/tutor/stream?thread=${encodeURIComponent(threadId)}`)

    source.addEventListener('ready', (event) => {
      setConnected(true)
      try {
        setCapabilities(JSON.parse((event as MessageEvent).data).capabilities)
      } catch {
        // A malformed ready frame is not worth tearing the panel down over.
      }
    })

    source.addEventListener('message', (event) => {
      try {
        const incoming = JSON.parse((event as MessageEvent).data) as ThreadMessage
        setMessages((prev) => {
          // Replace by id: a question is re-sent once it flips from pending to answered.
          const next = prev.filter((m) => m.id !== incoming.id)
          next.push(incoming)
          return next.sort((a, b) => a.ts.localeCompare(b.ts))
        })
      } catch {
        // Ignore unparseable frames rather than closing the stream.
      }
    })

    source.onerror = () => setConnected(false)

    return () => {
      source.close()
      setConnected(false)
    }
  }, [threadId, enabled])

  return { messages, capabilities, connected }
}
