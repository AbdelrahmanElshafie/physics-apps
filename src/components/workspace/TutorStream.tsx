'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * One server-sent-events connection per page, fanned out to every consumer.
 *
 * A lesson has a tutor rail plus one card per exercise — twenty-odd potential listeners. Browsers
 * allow only about six concurrent connections per origin over HTTP/1.1, so a stream per listener
 * exhausts the pool and then *ordinary* requests queue behind it: navigation stalls and a form
 * submit appears to hang forever. Hence a single topic-scoped stream, with subscribers selecting
 * the thread they care about.
 */

export interface ThreadMessage {
  id: string
  threadId: string
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

interface TutorStreamValue {
  byThread: Map<string, ThreadMessage[]>
  capabilities: TutorCapabilities | null
  connected: boolean
}

const TutorStreamContext = createContext<TutorStreamValue>({
  byThread: new Map(),
  capabilities: null,
  connected: false,
})

export function TutorStreamProvider({
  topicId,
  children,
}: {
  topicId: string
  children: ReactNode
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [capabilities, setCapabilities] = useState<TutorCapabilities | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    setMessages([])

    const source = new EventSource(`/api/tutor/stream?topic=${encodeURIComponent(topicId)}`)

    source.addEventListener('ready', (event) => {
      setConnected(true)
      try {
        setCapabilities(JSON.parse((event as MessageEvent).data).capabilities)
      } catch {
        // A malformed ready frame is not worth tearing the stream down over.
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
  }, [topicId])

  const value = useMemo<TutorStreamValue>(() => {
    const byThread = new Map<string, ThreadMessage[]>()
    for (const message of messages) {
      const list = byThread.get(message.threadId)
      if (list) list.push(message)
      else byThread.set(message.threadId, [message])
    }
    return { byThread, capabilities, connected }
  }, [messages, capabilities, connected])

  return <TutorStreamContext.Provider value={value}>{children}</TutorStreamContext.Provider>
}

/** Live messages for one thread, from the page's single stream. */
export function useThreadMessages(threadId: string): ThreadMessage[] {
  const { byThread } = useContext(TutorStreamContext)
  return byThread.get(threadId) ?? EMPTY
}

export function useTutorStream(): TutorStreamValue {
  return useContext(TutorStreamContext)
}

// A stable identity, so consumers that depend on the array do not re-run every render.
const EMPTY: ThreadMessage[] = []
