'use server'

import { revalidatePath } from 'next/cache'

import { asThreadId, parseTopicId, type TopicId } from '@core/domain'
import { askTutor, submitAttempt, threadFor, type SubmitAttemptResult } from '@core/services'
import { TutorBridgeUnavailableError } from '@physics/tutor-bridge'
import { container } from '@/container'

/**
 * Server actions — the only write path from the UI.
 *
 * Each one is a thin shell: validate the input, hand off to a core service, revalidate. The rules
 * about what a submission means live in `src/core/services`, not here, so they stay testable
 * without a running Next.js server.
 */

function topicPath(topicId: TopicId): string {
  const { syllabus, local } = parseTopicId(topicId)
  return `/learn/${syllabus}/${local}`
}

export async function markTopicViewed(topicId: string): Promise<void> {
  const { progress, clock, ids } = container()
  const state = await progress.state()

  // Idempotent: one `viewed` event per topic keeps the log meaningful rather than a page-hit tally.
  if (state.topics.get(topicId as TopicId)?.viewed) return

  await progress.append({
    v: 1,
    id: ids.next(),
    ts: clock.now().toISOString(),
    type: 'topic.viewed',
    topicId,
  })
  revalidatePath(topicPath(topicId as TopicId))
}

export async function submitAnswer(input: {
  topicId: string
  exerciseId: string
  answer: string
  explanation?: string
}): Promise<SubmitAttemptResult> {
  const { content, progress, checker, tutor, clock, ids } = container()
  const topicId = input.topicId as TopicId

  const exercises = await content.getExercises(topicId)
  const exercise = exercises.find((e) => e.id === input.exerciseId)
  if (!exercise) {
    throw new Error(`Unknown exercise "${input.exerciseId}" for topic "${input.topicId}".`)
  }

  const result = await submitAttempt(
    { progress, checker, tutor, clock, ids },
    {
      topicId,
      exercise,
      answer: input.answer,
      ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
    },
  )

  // Deliberately no revalidatePath here. The card renders the verdict from this return value and
  // any later grade arrives over the live stream, so re-rendering the whole page would only add
  // seconds (it recompiles the lesson MDX) without changing anything the learner sees.
  return result
}

export async function revealSolution(topicId: string, exerciseId: string): Promise<void> {
  const { progress, clock, ids } = container()
  await progress.append({
    v: 1,
    id: ids.next(),
    ts: clock.now().toISOString(),
    type: 'solution.revealed',
    topicId,
    exerciseId,
  })
  // Same reasoning as submitAnswer: the client already toggled the solution open.
}

export async function passCheckpoint(topicId: string, note?: string): Promise<void> {
  const { progress, clock, ids } = container()
  await progress.append({
    v: 1,
    id: ids.next(),
    ts: clock.now().toISOString(),
    type: 'checkpoint.passed',
    topicId,
    ...(note !== undefined && note.length > 0 ? { note } : {}),
  })
  // The navigator's status and mastery ring live on every page, so refresh the whole tree.
  revalidatePath('/', 'layout')
}

export async function addNote(topicId: string, body: string): Promise<void> {
  const trimmed = body.trim()
  if (trimmed.length === 0) return

  const { progress, clock, ids } = container()
  await progress.append({
    v: 1,
    id: ids.next(),
    ts: clock.now().toISOString(),
    type: 'note.added',
    topicId,
    body: trimmed,
  })
  revalidatePath(topicPath(topicId as TopicId))
}

/**
 * `ok: false` means the tutor bridge itself couldn't be reached — a read-only deployment with no
 * writable `data/`, almost certainly — not that the question was bad. Callers show that inline
 * instead of letting the exception reach Next's error boundary, which otherwise turns "I can't
 * send this" into the whole page crashing.
 */
export type SendQuestionResult =
  | { ok: true; threadId: string; messageId: string }
  | { ok: false; reason: 'offline' }

export async function sendQuestion(input: {
  body: string
  topicId?: string
  exerciseId?: string
  equationId?: string
  equationLatex?: string
  equationLabel?: string
  draftAnswer?: string
}): Promise<SendQuestionResult> {
  const { tutor } = container()

  const threadId = threadFor({
    ...(input.topicId !== undefined ? { topicId: input.topicId as TopicId } : {}),
    ...(input.exerciseId !== undefined ? { exerciseId: input.exerciseId } : {}),
    ...(input.equationId !== undefined ? { equationId: input.equationId } : {}),
  })

  try {
    const messageId = await askTutor(tutor, {
      threadId,
      body: input.body,
      context: {
        ...(input.topicId !== undefined ? { topicId: input.topicId as TopicId } : {}),
        ...(input.exerciseId !== undefined ? { exerciseId: input.exerciseId } : {}),
        ...(input.equationLatex !== undefined ? { equationLatex: input.equationLatex } : {}),
        ...(input.equationLabel !== undefined ? { equationLabel: input.equationLabel } : {}),
        ...(input.draftAnswer !== undefined ? { draftAnswer: input.draftAnswer } : {}),
      },
    })
    return { ok: true, threadId: String(threadId), messageId: String(messageId) }
  } catch (cause) {
    if (cause instanceof TutorBridgeUnavailableError) return { ok: false, reason: 'offline' }
    throw cause
  }
}

/** Reads a thread for the tutor rail's initial render and after a reconnect. */
export async function readThread(threadId: string) {
  const { tutor } = container()
  const messages = await tutor.history(asThreadId(threadId))
  return messages.map((m) => ({
    id: String(m.id),
    role: m.role,
    body: m.body,
    ts: m.ts,
    pending: m.pending ?? false,
    context: m.context ?? {},
  }))
}
