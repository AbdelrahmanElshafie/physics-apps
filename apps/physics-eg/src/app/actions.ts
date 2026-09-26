'use server'

import { revalidatePath } from 'next/cache'

import type { TopicId } from '@core/domain'
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
}): Promise<SubmitAttemptResult> {
  const { content, progress, checker, clock, ids } = container
  const topicId = input.topicId as TopicId

  const exercises = await content.getExercises(topicId)
  const exercise = exercises.find((e) => e.id === input.exerciseId)
  if (!exercise) {
    throw new Error(`Unknown exercise "${input.exerciseId}" for topic "${input.topicId}".`)
  }

  // No revalidatePath here: the card renders the verdict from this return value directly, and
  // revalidating would recompile the lesson MDX for nothing the learner would see change.
  return submitAttempt({ progress, checker, clock, ids }, { topicId, exercise, answer: input.answer })
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
