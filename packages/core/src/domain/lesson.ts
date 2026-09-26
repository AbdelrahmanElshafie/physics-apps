import { z } from 'zod'

/** Lesson frontmatter. The body is MDX and stays an opaque string in core — rendering is UI. */
export const lessonFrontmatterSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  /** Equations worth surfacing in the navigator / search, as LaTeX. */
  keyEquations: z.array(z.object({ latex: z.string(), label: z.string().optional() })).default([]),
  readingMinutes: z.number().int().positive().optional(),
  updated: z.string().optional(),
})

export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>

export interface Lesson {
  readonly topicId: string
  readonly frontmatter: LessonFrontmatter
  /** Raw MDX body, compiled by the UI layer. */
  readonly body: string
  /**
   * Which locale this content is actually in — may differ from the one requested, when a
   * translation does not exist and the adapter fell back to the default. A plain string rather
   * than a fixed union, because each app owns its own set of supported locales.
   */
  readonly servedLocale: string
}

export const glossaryFileSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(
    z.object({
      name: z.string().min(1),
      latex: z.string().min(1),
      term: z.string().min(1),
      meaning: z.string().min(1),
      seeAlso: z.array(z.string()).default([]),
    }),
  ),
})

export type GlossaryEntry = z.infer<typeof glossaryFileSchema>['entries'][number]
