import { z } from 'zod'

/**
 * A scratchpad: free-form working, written as a sequence of steps.
 *
 * Distinct from an exercise. An exercise has a question and a known answer; a scratchpad is the
 * learner's own derivation, where nobody has said in advance what the right answer is. What *can*
 * be checked is internal consistency — whether each line follows from the one before — which is
 * where most algebra actually goes wrong.
 */

export const scratchStepSchema = z.object({
  id: z.string().min(1),
  /** The line of working, as LaTeX. */
  latex: z.string(),
  /** The learner's own justification for this step. */
  note: z.string().optional(),
})

export const scratchpadSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  /** Optional link to the topic being worked on, so a review lands in context. */
  topicId: z.string().optional(),
  steps: z.array(scratchStepSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ScratchStep = z.infer<typeof scratchStepSchema>
export type Scratchpad = z.infer<typeof scratchpadSchema>

export interface ScratchpadSummary {
  readonly id: string
  readonly title: string
  readonly topicId?: string
  readonly stepCount: number
  readonly updatedAt: string
}

export function summariseScratchpad(pad: Scratchpad): ScratchpadSummary {
  return {
    id: pad.id,
    title: pad.title,
    ...(pad.topicId !== undefined ? { topicId: pad.topicId } : {}),
    stepCount: pad.steps.length,
    updatedAt: pad.updatedAt,
  }
}

/** Renders the working as plain text, for the review request I read in the terminal. */
export function formatWorking(pad: Scratchpad): string {
  const lines = [`Working: ${pad.title}`, '']

  pad.steps.forEach((step, index) => {
    lines.push(`  (${index + 1}) ${step.latex || '(blank)'}`)
    if (step.note) lines.push(`      reason: ${step.note}`)
  })

  return lines.join('\n')
}
