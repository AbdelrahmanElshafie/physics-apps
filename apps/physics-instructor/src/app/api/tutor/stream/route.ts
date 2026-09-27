import type { NextRequest } from 'next/server'

import { createTutorSSEStream } from '@physics/tutor-bridge'
import { container } from '@/container'

/**
 * Server-sent events for a tutor conversation.
 *
 * `?topic=<topicId>` streams every thread belonging to that topic — the rail's conversation plus
 * one per exercise or equation. `?thread=<threadId>` streams a single thread. See
 * `createTutorSSEStream` in `@physics/tutor-bridge` for the framing itself.
 */

export const dynamic = 'force-dynamic'
// Node runtime required: the transport watches the filesystem, which the edge runtime cannot do.
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get('topic')
  const thread = request.nextUrl.searchParams.get('thread')
  const { tutor } = container()

  return createTutorSSEStream(tutor, { topic, thread }, { signal: request.signal })
}
