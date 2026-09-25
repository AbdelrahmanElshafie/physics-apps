import type { LearningEvent } from '../domain/events'
import type { ProgressState } from '../domain/progress'

/**
 * Append-only progress store.
 *
 * There is intentionally no `update` or `delete`: state is derived by replaying `append`s.
 * The filesystem adapter writes JSONL; a SQL adapter (M5) writes rows to an events table.
 */
export interface ProgressRepository {
  /** `event.id` and `event.ts` are filled in by the caller's service, not here. */
  append(event: LearningEvent): Promise<void>
  read(): Promise<LearningEvent[]>
  /** Reduced state, cached by the adapter where it can be. */
  state(): Promise<ProgressState>
}
