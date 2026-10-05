'use server'

import { revalidatePath } from 'next/cache'

import { askTutor, threadFor, TutorBridgeUnavailableError } from '@physics/tutor-bridge'
import { asThreadId, type TopicId } from '@core/domain'
import { submitAttempt, type SubmitAttemptResult } from '@core/services'
import { container } from '@/container'

/**
 * Server actions — the only write path from the UI. Each one is a thin shell: validate, hand off
 * to a core service, log. The grading rules themselves live in `src/core/services`.
 */

export async function markTopicViewed(topicId: string): Promise<void> {
  const { progress, clock, ids } = container
  const state = await progress.state()
  if (state.topics.get(topicId as TopicId)?.viewed) return

  await progress.append({
    v: 1,
    id: ids.next(),
    ts: clock.now().toISOString(),
    type: 'topic.viewed',
    topicId,
  })
}

export async function submitExercise(input: {
  topicId: string
  exerciseId: string
  answer: string
  explanation?: string
}): Promise<SubmitAttemptResult> {
  const { content, progress, checker, tutor, clock, ids } = container
  const topicId = input.topicId as TopicId

  const exercises = await content.getExercises(topicId)
  const exercise = exercises.find((e) => e.id === input.exerciseId)
  if (!exercise) {
    throw new Error(`Unknown exercise "${input.exerciseId}" for topic "${input.topicId}".`)
  }

  // No revalidatePath here: the card renders the verdict from this return value directly, and
  // revalidating would recompile the lesson MDX for nothing the learner would see change.
  return submitAttempt(
    { progress, checker, tutor, clock, ids },
    {
      topicId,
      exercise,
      answer: input.answer,
      ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
    },
  )
}

export async function revealSolution(topicId: string, exerciseId: string): Promise<void> {
  const { progress, clock, ids } = container
  await progress.append({
    v: 1,
    id: ids.next(),
    ts: clock.now().toISOString(),
    type: 'solution.revealed',
    topicId,
    exerciseId,
  })
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
  draftAnswer?: string
}): Promise<SendQuestionResult> {
  const { tutor } = container

  const threadId = threadFor({
    ...(input.topicId !== undefined ? { topicId: input.topicId as TopicId } : {}),
    ...(input.exerciseId !== undefined ? { exerciseId: input.exerciseId } : {}),
  })

  try {
    const messageId = await askTutor(tutor, {
      threadId,
      body: input.body,
      context: {
        ...(input.topicId !== undefined ? { topicId: input.topicId as TopicId } : {}),
        ...(input.exerciseId !== undefined ? { exerciseId: input.exerciseId } : {}),
        ...(input.draftAnswer !== undefined ? { draftAnswer: input.draftAnswer } : {}),
      },
    })
    return { ok: true, threadId: String(threadId), messageId: String(messageId) }
  } catch (cause) {
    if (cause instanceof TutorBridgeUnavailableError) return { ok: false, reason: 'offline' }
    throw cause
  }
}

/** Reads a thread for a fresh page load, before the live stream has anything of its own. */
export async function readThread(threadId: string) {
  const { tutor } = container
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

export async function passCheckpoint(topicId: string): Promise<void> {
  const { progress, clock, ids } = container
  await progress.append({
    v: 1,
    id: ids.next(),
    ts: clock.now().toISOString(),
    type: 'checkpoint.passed',
    topicId,
  })
  // The navigator's mastery ring lives on every page, so this one is worth the full refresh.
  revalidatePath('/', 'layout')
}
