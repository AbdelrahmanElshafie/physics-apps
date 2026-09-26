import { z } from 'zod'

/**
 * Exercise schema, version 1.
 *
 * The answer kinds are drawn from what Module 1.1 actually contains: Q4 is compute-and-explain,
 * Q7 is true/false-with-reasoning, Q17 is a matrix product, Q10 is pure prose. So grading is
 * two-tier by necessity: `check` runs instantly and deterministically where the answer is
 * checkable; anything needing reasoning is routed to the tutor.
 */

export const ANSWER_KINDS = [
  'numeric',
  'latex',
  'vector',
  'matrix',
  'truefalse',
  'multichoice',
  'text',
] as const
export type AnswerKind = (typeof ANSWER_KINDS)[number]

/** How a submitted answer is compared. `tutor` means there is nothing to compare — I read it. */
export const checkSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('exact'), value: z.union([z.string(), z.number(), z.boolean()]) }),
  z.object({
    type: z.literal('numeric'),
    value: z.number(),
    tolerance: z.number().nonnegative().default(1e-9),
  }),
  z.object({
    type: z.literal('numeric-list'),
    value: z.array(z.number()),
    tolerance: z.number().nonnegative().default(1e-9),
  }),
  z.object({
    type: z.literal('numeric-matrix'),
    value: z.array(z.array(z.number())),
    tolerance: z.number().nonnegative().default(1e-9),
  }),
  z.object({
    type: z.literal('latex-equivalent'),
    value: z.string(),
    /** Extra spellings that should also pass, e.g. `\mathbb{R}^5` vs `R^5`. */
    accept: z.array(z.string()).default([]),
  }),
  z.object({
    /**
     * Any non-zero scalar multiple of `value` counts as correct.
     *
     * Exists for eigenvector questions: an eigenvector is a *direction*, so (1,1) and (2,2) are
     * equally right, and a question that says "give any vector on that line" must not then accept
     * only one of them.
     */
    type: z.literal('parallel'),
    value: z.array(z.number()),
    tolerance: z.number().nonnegative().default(1e-9),
  }),
  z.object({
    /**
     * Full symbolic equivalence, e.g. a factored form against an expanded one. Settled by the
     * SymPy adapter; falls through to the tutor when that is unavailable or undecided.
     */
    type: z.literal('symbolic'),
    value: z.string(),
  }),
  z.object({ type: z.literal('tutor') }),
])
export type Check = z.infer<typeof checkSchema>

export const REVEAL_POLICIES = ['after-attempt', 'after-correct', 'on-request'] as const

export const exerciseSchema = z.object({
  id: z.string().min(1),
  /** Exercise set label, mirroring the handbook's "Set A".."Set G" grouping. */
  set: z.string().min(1),
  label: z.string().optional(),
  kind: z.enum(ANSWER_KINDS),
  prompt: z.string().min(1),
  /** Optional lead-in shown above the prompt, e.g. a matrix to multiply. */
  given: z.string().optional(),
  choices: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
  check: checkSchema,
  /** Requires a written justification alongside the answer. Always tutor-graded. */
  explain: z
    .object({ required: z.boolean().default(false), hint: z.string().optional() })
    .default({ required: false }),
  solution: z.string().min(1),
  revealPolicy: z.enum(REVEAL_POLICIES).default('after-attempt'),
  hint: z.string().optional(),
  /** Answer placeholder in LaTeX, seeds the math field so the shape is obvious. */
  scaffold: z.string().optional(),
})

export const exerciseFileSchema = z.object({
  schemaVersion: z.literal(1),
  topic: z.string().min(1),
  intro: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1),
})

export type Exercise = z.infer<typeof exerciseSchema>
export type ExerciseFile = z.infer<typeof exerciseFileSchema>

/** Grouped for rendering, preserving the authored set order. */
export function groupBySet(exercises: readonly Exercise[]): { set: string; exercises: Exercise[] }[] {
  const groups: { set: string; exercises: Exercise[] }[] = []
  for (const ex of exercises) {
    const existing = groups.find((g) => g.set === ex.set)
    if (existing) existing.exercises.push(ex)
    else groups.push({ set: ex.set, exercises: [ex] })
  }
  return groups
}

/** True when the exercise cannot be settled without me reading it. */
export function needsTutorReview(exercise: Exercise): boolean {
  return exercise.check.type === 'tutor' || exercise.explain.required
}
