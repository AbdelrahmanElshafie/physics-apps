'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ulid } from 'ulid'

import { asThreadId, formatWorking, type Scratchpad, type ScratchStep } from '@core/domain'
import { askTutor } from '@physics/tutor-bridge'
import { container } from '@/container'

/**
 * Practice-pad actions.
 *
 * Reuses `@physics/scratchpad`'s storage and schema as-is (a pad is just a title plus an ordered
 * list of text entries) but *not* its step-by-step "does this follow from the last line" checker —
 * that is built for algebra, where a line is judged against the one before it. A written sentence
 * doesn't have a "previous line" to be consistent with; it just needs a human (the tutor) to read
 * it. So this is deliberately thinner than the physics apps' scratchpad: write, then ask.
 */

const threadForPad = (padId: string) => asThreadId(`practice:${padId}`)

export async function createPracticePad(input: { title?: string; topicId?: string }): Promise<void> {
  const { scratch, clock } = container
  const now = clock.now().toISOString()

  const id = ulid()
  const pad: Scratchpad = {
    schemaVersion: 1,
    id,
    title: input.title?.trim() || 'Untitled practice',
    ...(input.topicId ? { topicId: input.topicId } : {}),
    steps: [{ id: ulid(), latex: '' }],
    createdAt: now,
    updatedAt: now,
  }

  await scratch.save(pad)
  revalidatePath('/practice')
  redirect(`/practice/${id}`)
}

export async function savePracticePad(input: {
  id: string
  title: string
  steps: ScratchStep[]
}): Promise<{ savedAt: string }> {
  const { scratch, clock } = container

  const existing = await scratch.get(input.id)
  if (!existing) throw new Error(`No practice pad with id ${input.id}.`)

  const updatedAt = clock.now().toISOString()
  await scratch.save({
    ...existing,
    title: input.title.trim() || 'Untitled practice',
    steps: input.steps,
    updatedAt,
  })

  // Deliberately not revalidating the editor route: the client already holds this state, and a
  // refresh mid-typing would fight the user. Only the list needs to know.
  revalidatePath('/practice')
  return { savedAt: updatedAt }
}

export async function deletePracticePad(id: string): Promise<void> {
  const { scratch } = container
  await scratch.remove(id)
  revalidatePath('/practice')
  redirect('/practice')
}

/** Sends the whole pad to the tutor for review. */
export async function requestPracticeReview(input: {
  id: string
  question?: string
}): Promise<{ threadId: string }> {
  const { scratch, tutor } = container

  const pad = await scratch.get(input.id)
  if (!pad) throw new Error(`No practice pad with id ${input.id}.`)

  const threadId = threadForPad(pad.id)
  const question = input.question?.trim()

  // The writing goes in the message body so it is readable directly in the terminal, without
  // needing to open the app to see what is being asked about.
  const body = [question || 'Please review what I wrote.', '', formatWorking(pad)].join('\n')

  await askTutor(tutor, {
    threadId,
    body,
    context: {
      ...(pad.topicId ? { topicId: pad.topicId as never } : {}),
    },
  })

  return { threadId: String(threadId) }
}
