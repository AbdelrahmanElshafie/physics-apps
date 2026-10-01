import type { ReviewEvent } from './events'
import type { ReviewState } from './events'

/**
 * Append-only review store — same three-method shape as `ProgressRepository` in `@physics/core`,
 * for the same reason: no `update`/`delete`, state is derived by replaying `append`s.
 */
export interface ReviewRepository {
  /** `event.id` and `event.ts` are filled in by the caller, not here. */
  append(event: ReviewEvent): Promise<void>
  read(): Promise<ReviewEvent[]>
  /** Reduced state, cached by the adapter where it can be. */
  state(): Promise<ReviewState>
}
