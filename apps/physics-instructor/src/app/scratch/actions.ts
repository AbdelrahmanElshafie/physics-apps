'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ulid } from 'ulid'

import { asThreadId, formatWorking, type Scratchpad, type ScratchStep } from '@core/domain'
import { askTutor, checkWorking, type WorkingReport } from '@core/services'
import { container } from '@/container'

/**
 * Scratchpad actions.
 *
 * Kept thin in the same way as the exercise actions: validate, delegate to a core service, and
 * revalidate. The interesting logic — what "this step follows from the last" means — lives in
 * `checkWorking`, where it is testable without a server.
 */

/** Threads for a scratchpad are keyed on the pad, so a follow-up stays in one conversation. */
const threadForPad = (padId: string) => asThreadId(`scratch:${padId}`)

export async function createScratchpad(input: { title?: string; topicId?: string }): Promise<void> {
  const { scratch, clock } = container()
  const now = clock.now().toISOString()

  // ULIDs are lexicographically sortable and safe in a filename.
  const id = ulid()
  const pad: Scratchpad = {
    schemaVersion: 1,
    id,
    title: input.title?.trim() || 'Untitled working',
    ...(input.topicId ? { topicId: input.topicId } : {}),
    steps: [{ id: ulid(), latex: '' }],
    createdAt: now,
    updatedAt: now,
  }

  await scratch.save(pad)
  revalidatePath('/scratch')
  redirect(`/scratch/${id}`)
}

export async function saveScratchpad(input: {
  id: string
  title: string
  steps: ScratchStep[]
}): Promise<{ savedAt: string }> {
  const { scratch, clock } = container()

  const existing = await scratch.get(input.id)
  if (!existing) throw new Error(`No scratchpad with id ${input.id}.`)

  const updatedAt = clock.now().toISOString()
  await scratch.save({
    ...existing,
    title: input.title.trim() || 'Untitled working',
    steps: input.steps,
    updatedAt,
  })

  // Deliberately not revalidating the editor route: the client already holds this state, and a
  // refresh mid-typing would fight the user. Only the list needs to know.
  revalidatePath('/scratch')
  return { savedAt: updatedAt }
}

export async function deleteScratchpad(id: string): Promise<void> {
  const { scratch } = container()
  await scratch.remove(id)
  revalidatePath('/scratch')
  redirect('/scratch')
}

/** Verifies each line follows from the one before. */
export async function checkScratchpad(steps: ScratchStep[]): Promise<WorkingReport> {
  const { checker } = container()
  return checkWorking(steps, checker)
}

/** Sends the whole working to me for review. */
export async function requestScratchReview(input: {
  id: string
  question?: string
}): Promise<{ threadId: string }> {
  const { scratch, tutor } = container()

  const pad = await scratch.get(input.id)
  if (!pad) throw new Error(`No scratchpad with id ${input.id}.`)

  const threadId = threadForPad(pad.id)
  const question = input.question?.trim()

  // The working goes in the message body so it is readable directly in the terminal, without
  // needing to open the app to see what is being asked about.
  const body = [
    question || 'Please review my working.',
    '',
    formatWorking(pad),
  ].join('\n')

  await askTutor(tutor, {
    threadId,
    body,
    context: {
      ...(pad.topicId ? { topicId: pad.topicId as never } : {}),
    },
  })

  return { threadId: String(threadId) }
}
