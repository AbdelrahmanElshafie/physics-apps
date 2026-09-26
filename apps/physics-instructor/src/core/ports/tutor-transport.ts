import type { MessageId, ThreadId, TopicId } from '../domain/ids'

/**
 * The tutor channel — the seam between "answered by Claude Code" and "answered by the API".
 *
 * Today: the claude-code adapter writes a request file that I pick up in the terminal, and the
 * reply arrives as a file the adapter watches. Latency is `deferred` and there is no streaming.
 *
 * Later (M3): the anthropic adapter implements the same interface with `latency: 'interactive'`
 * and `streaming: true`.
 *
 * The UI must branch on `capabilities`, never on `id`. That is the whole point: a component that
 * asks "can this stream?" keeps working when the answer changes, whereas one that asks
 * "is this the API?" has to be rewritten.
 */

export type TutorTransportId = 'claude-code' | 'anthropic'

export interface TutorCapabilities {
  /** Whether replies arrive incrementally. False for the file bridge. */
  readonly streaming: boolean
  /**
   * `deferred`  — a human (me) answers out of band; show a queued state, not a typing dot.
   * `interactive` — a reply is expected within seconds.
   */
  readonly latency: 'deferred' | 'interactive'
  /** Whether the transport can see progress/content on its own (API tool-use). */
  readonly awareOfProgress: boolean
}

/** What the learner is asking about, so I get the question with its context attached. */
export interface TutorContext {
  readonly topicId?: TopicId
  readonly exerciseId?: string
  /** LaTeX of the specific equation the question was raised from. */
  readonly equationLatex?: string
  readonly equationLabel?: string
  /** The learner's current working answer, if they asked from an exercise. */
  readonly draftAnswer?: string
}

export interface OutboundMessage {
  readonly threadId: ThreadId
  readonly body: string
  readonly context: TutorContext
}

export interface TutorMessage {
  readonly id: MessageId
  readonly threadId: ThreadId
  readonly role: 'learner' | 'tutor'
  readonly body: string
  readonly ts: string
  readonly context?: TutorContext
  /** Set while a deferred reply is outstanding. */
  readonly pending?: boolean
}

export type TutorEvent =
  | { readonly kind: 'message'; readonly message: TutorMessage }
  | { readonly kind: 'delta'; readonly messageId: MessageId; readonly text: string }
  | { readonly kind: 'status'; readonly messageId: MessageId; readonly status: 'queued' | 'answered' }

export type Unsubscribe = () => void

export interface TutorTransport {
  readonly id: TutorTransportId
  readonly capabilities: TutorCapabilities
  send(message: OutboundMessage): Promise<MessageId>
  history(threadId: ThreadId): Promise<TutorMessage[]>
  /** Fires for anything new on the thread. Must be safe to call from a server-sent-events route. */
  subscribe(threadId: ThreadId, listener: (event: TutorEvent) => void): Unsubscribe

  /**
   * Fires for every thread belonging to `topicId` — the topic's own conversation and each of its
   * per-exercise and per-equation threads.
   *
   * This exists because a lesson page shows one rail plus one card per exercise, and a browser
   * allows only a handful of concurrent connections per origin. Subscribing per widget starves
   * that pool and stalls ordinary requests, so a page opens exactly one scoped stream and fans
   * the messages out on the client.
   */
  subscribeTopic(topicId: string, listener: (event: TutorEvent) => void): Unsubscribe
}
