/**
 * Identifier types.
 *
 * Topic identifiers are *namespaced* by syllabus from day one (`nuclear-physics:m1.1-hilbert`).
 * That costs nothing now and means a second syllabus — or a prerequisite that points across
 * syllabi — needs no ID migration later.
 */

declare const brand: unique symbol
type Brand<T, B> = T & { readonly [brand]: B }

export type SyllabusId = Brand<string, 'SyllabusId'>
export type LocalTopicId = Brand<string, 'LocalTopicId'>
/** Fully qualified: `<syllabusId>:<localTopicId>`. The only form stored or linked. */
export type TopicId = Brand<string, 'TopicId'>
export type ModuleId = Brand<string, 'ModuleId'>
export type ExerciseId = Brand<string, 'ExerciseId'>
export type AttemptId = Brand<string, 'AttemptId'>
export type ThreadId = Brand<string, 'ThreadId'>
export type MessageId = Brand<string, 'MessageId'>
export type EventId = Brand<string, 'EventId'>

export const asSyllabusId = (s: string): SyllabusId => s as SyllabusId
export const asLocalTopicId = (s: string): LocalTopicId => s as LocalTopicId
export const asModuleId = (s: string): ModuleId => s as ModuleId
export const asExerciseId = (s: string): ExerciseId => s as ExerciseId
export const asThreadId = (s: string): ThreadId => s as ThreadId

const SEPARATOR = ':'

export function qualifyTopicId(syllabus: SyllabusId, local: LocalTopicId | string): TopicId {
  return `${syllabus}${SEPARATOR}${local}` as TopicId
}

/** Accepts a bare local id and qualifies it against `fallback`; passes through already-qualified ids. */
export function resolveTopicRef(ref: string, fallback: SyllabusId): TopicId {
  return (ref.includes(SEPARATOR) ? ref : `${fallback}${SEPARATOR}${ref}`) as TopicId
}

export function parseTopicId(id: TopicId): { syllabus: SyllabusId; local: LocalTopicId } {
  const at = id.indexOf(SEPARATOR)
  if (at < 1 || at === id.length - 1) {
    throw new Error(`Malformed TopicId "${id}" — expected "<syllabusId>:<topicId>".`)
  }
  return {
    syllabus: id.slice(0, at) as SyllabusId,
    local: id.slice(at + 1) as LocalTopicId,
  }
}
