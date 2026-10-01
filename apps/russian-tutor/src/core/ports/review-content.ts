import type { ReviewCard } from '@physics/review'

/**
 * Where review cards come from — kept local to this app, not in `@physics/core`, for the same
 * reason the lesson/exercise content port stays per-app: reading `content/syllabi/<id>/review/…`
 * off disk is a filesystem-and-folder-layout decision, not a subject-agnostic concern.
 */
export interface ReviewContentPort {
  /** Cards for one topic, or an empty array if that topic has no review deck yet. */
  getDeck(topicId: string): Promise<ReviewCard[]>
  /** Every card across every topic that has a review deck. */
  allDecks(): Promise<ReviewCard[]>
}
