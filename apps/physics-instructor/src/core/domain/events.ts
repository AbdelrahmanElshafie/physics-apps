import { z } from 'zod'

/**
 * The append-only event log — the single source of truth for progress.
 *
 * Chosen over a mutable `progress.json` because: history is never destroyed, streaks and
 * spaced repetition become derivable with no migration, the log diffs cleanly in git, and I can
 * grade work from the terminal by appending one line.
 *
 * Every event carries `v` so the log stays readable as the shape evolves. Never edit or reorder
 * past lines — correct by appending.
 */

const base = {
  v: z.literal(1),
  id: z.string().min(1),
  ts: z.string().datetime(),
}

export const learningEventSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('topic.viewed'),
    topicId: z.string().min(1),
  }),
  z.object({
    ...base,
    type: z.literal('attempt.submitted'),
    topicId: z.string().min(1),
    exerciseId: z.string().min(1),
    attemptId: z.string().min(1),
    /** The learner's answer, always stored as LaTeX or plain text — never pre-graded. */
    answer: z.string(),
    explanation: z.string().optional(),
    /** Result of the deterministic checker, when one applied. */
    autoVerdict: z.enum(['correct', 'incorrect', 'unverified']),
  }),
  z.object({
    ...base,
    type: z.literal('attempt.graded'),
    topicId: z.string().min(1),
    exerciseId: z.string().min(1),
    attemptId: z.string().min(1),
    verdict: z.enum(['correct', 'partial', 'incorrect']),
    feedback: z.string(),
    gradedBy: z.enum(['tutor', 'auto']),
  }),
  z.object({
    ...base,
    type: z.literal('solution.revealed'),
    topicId: z.string().min(1),
    exerciseId: z.string().min(1),
  }),
  z.object({
    ...base,
    type: z.literal('checkpoint.passed'),
    topicId: z.string().min(1),
    note: z.string().optional(),
  }),
  z.object({
    ...base,
    type: z.literal('note.added'),
    topicId: z.string().min(1),
    body: z.string().min(1),
  }),
])

export type LearningEvent = z.infer<typeof learningEventSchema>
export type LearningEventType = LearningEvent['type']

/** Parses one JSONL line. Returns null for blank lines so a trailing newline is harmless. */
export function parseEventLine(line: string): LearningEvent | null {
  const trimmed = line.trim()
  if (trimmed.length === 0) return null
  return learningEventSchema.parse(JSON.parse(trimmed))
}
