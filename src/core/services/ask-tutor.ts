import { asThreadId, type MessageId, type ThreadId, type TopicId } from '../domain/ids'
import type { TutorContext, TutorTransport } from '../ports/tutor-transport'

/**
 * Asking a question. Thin by design — the interesting behaviour is in the transport, and this
 * exists so the UI never touches a transport directly and thread naming stays in one place.
 */

/**
 * Threads are addressed by what the question is *about*, not by a random id, so a follow-up
 * about the same equation lands in the same conversation and I see the history together.
 */
export function threadFor(scope: {
  topicId?: TopicId
  exerciseId?: string
  equationId?: string
}): ThreadId {
  if (scope.exerciseId && scope.topicId) return asThreadId(`${scope.topicId}#${scope.exerciseId}`)
  if (scope.equationId && scope.topicId) return asThreadId(`${scope.topicId}@${scope.equationId}`)
  if (scope.topicId) return asThreadId(String(scope.topicId))
  return asThreadId('general')
}

export async function askTutor(
  tutor: TutorTransport,
  input: { threadId: ThreadId; body: string; context?: TutorContext },
): Promise<MessageId> {
  const body = input.body.trim()
  if (body.length === 0) throw new Error('Cannot send an empty question.')

  return tutor.send({
    threadId: input.threadId,
    body,
    context: input.context ?? {},
  })
}
