import { z } from 'zod'
import { type ModuleId, type SyllabusId, type TopicId, qualifyTopicId, resolveTopicRef } from './ids'

/**
 * Syllabus schema, version 1.
 *
 * A syllabus is authored as one YAML file per folder under `content/syllabi/`. The registry
 * discovers folders, so *adding a syllabus is adding a folder* — no code change. `schemaVersion`
 * is here from the first file so the shape can evolve without guesswork.
 */

export const TOPIC_KINDS = ['lesson', 'implementation', 'checkpoint', 'project'] as const
export type TopicKind = (typeof TOPIC_KINDS)[number]

export const topicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(TOPIC_KINDS).default('lesson'),
  /** Prerequisites. Bare ids resolve within this syllabus; `other:topic` crosses syllabi. */
  requires: z.array(z.string()).default([]),
  /** Marks the topic as load-bearing — surfaced prominently in the navigator. */
  critical: z.boolean().default(false),
  estimatedMinutes: z.number().int().positive().optional(),
  summary: z.string().optional(),
})

export const moduleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /**
   * Optional parent heading, e.g. "Module 1 — Quantum Mechanics Mathematics".
   * The source checklist nests Phase > Module N > 1.1 > topics; this carries that middle level
   * without adding a fourth tier to the tree that only one syllabus would use.
   */
  group: z.string().optional(),
  summary: z.string().optional(),
  topics: z.array(topicSchema).min(1),
})

export const phaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  modules: z.array(moduleSchema).min(1),
})

export const syllabusFileSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  goal: z.string().optional(),
  phases: z.array(phaseSchema).min(1),
})

export type SyllabusFile = z.infer<typeof syllabusFileSchema>
export type TopicFile = z.infer<typeof topicSchema>

/** A topic with its identity resolved and its place in the tree recorded. */
export interface Topic {
  readonly id: TopicId
  readonly localId: string
  readonly syllabusId: SyllabusId
  readonly moduleId: ModuleId
  readonly phaseId: string
  readonly title: string
  readonly kind: TopicKind
  readonly requires: readonly TopicId[]
  readonly critical: boolean
  readonly estimatedMinutes?: number
  readonly summary?: string
  /** Position in the authored reading order, used for "next up" tie-breaking. */
  readonly order: number
}

export interface Module {
  readonly id: ModuleId
  readonly title: string
  readonly group?: string
  readonly summary?: string
  readonly phaseId: string
  readonly topicIds: readonly TopicId[]
}

export interface Phase {
  readonly id: string
  readonly title: string
  readonly summary?: string
  readonly moduleIds: readonly ModuleId[]
}

/** A validated, index-built syllabus. Lookups are O(1); the authored order is preserved. */
export interface Syllabus {
  readonly id: SyllabusId
  readonly title: string
  readonly subtitle?: string
  readonly description?: string
  readonly goal?: string
  readonly phases: readonly Phase[]
  readonly modules: ReadonlyMap<ModuleId, Module>
  readonly topics: ReadonlyMap<TopicId, Topic>
  /** Authored reading order, flattened across phases and modules. */
  readonly order: readonly TopicId[]
}

/** Turns a parsed YAML file into an indexed `Syllabus`. Pure — no I/O. */
export function buildSyllabus(file: SyllabusFile): Syllabus {
  const syllabusId = file.id as SyllabusId
  const topics = new Map<TopicId, Topic>()
  const modules = new Map<ModuleId, Module>()
  const phases: Phase[] = []
  const order: TopicId[] = []

  for (const phase of file.phases) {
    const moduleIds: ModuleId[] = []

    for (const mod of phase.modules) {
      const moduleId = mod.id as ModuleId
      const topicIds: TopicId[] = []

      for (const t of mod.topics) {
        const id = qualifyTopicId(syllabusId, t.id)
        if (topics.has(id)) {
          throw new Error(`Duplicate topic id "${id}" in syllabus "${file.id}".`)
        }
        topics.set(id, {
          id,
          localId: t.id,
          syllabusId,
          moduleId,
          phaseId: phase.id,
          title: t.title,
          kind: t.kind,
          requires: t.requires.map((r) => resolveTopicRef(r, syllabusId)),
          critical: t.critical,
          ...(t.estimatedMinutes !== undefined ? { estimatedMinutes: t.estimatedMinutes } : {}),
          ...(t.summary !== undefined ? { summary: t.summary } : {}),
          order: order.length,
        })
        topicIds.push(id)
        order.push(id)
      }

      if (modules.has(moduleId)) {
        throw new Error(`Duplicate module id "${moduleId}" in syllabus "${file.id}".`)
      }
      modules.set(moduleId, {
        id: moduleId,
        title: mod.title,
        ...(mod.group !== undefined ? { group: mod.group } : {}),
        ...(mod.summary !== undefined ? { summary: mod.summary } : {}),
        phaseId: phase.id,
        topicIds,
      })
      moduleIds.push(moduleId)
    }

    phases.push({
      id: phase.id,
      title: phase.title,
      ...(phase.summary !== undefined ? { summary: phase.summary } : {}),
      moduleIds,
    })
  }

  return {
    id: syllabusId,
    title: file.title,
    ...(file.subtitle !== undefined ? { subtitle: file.subtitle } : {}),
    ...(file.description !== undefined ? { description: file.description } : {}),
    ...(file.goal !== undefined ? { goal: file.goal } : {}),
    phases,
    modules,
    topics,
    order,
  }
}
