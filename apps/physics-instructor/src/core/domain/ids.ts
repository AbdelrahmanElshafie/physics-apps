/**
 * Re-exported from @physics/core so a TopicId/ThreadId/MessageId here is the exact same branded
 * type the shared tutor-bridge and scratchpad packages expect. The brand uses a `unique symbol`,
 * which is only equal to itself by declaration — two textually identical `ids.ts` files in
 * different modules would produce nominally distinct, mutually-unassignable types. Kept at this
 * path (rather than switching every `from './ids'` import across this directory) so nothing else
 * in `src/core/domain` needs to change.
 */
export {
  type SyllabusId,
  type LocalTopicId,
  type TopicId,
  type ModuleId,
  type ExerciseId,
  type AttemptId,
  type ThreadId,
  type MessageId,
  type EventId,
  asSyllabusId,
  asLocalTopicId,
  asModuleId,
  asExerciseId,
  asThreadId,
  qualifyTopicId,
  resolveTopicRef,
  parseTopicId,
} from '@physics/core/domain'
