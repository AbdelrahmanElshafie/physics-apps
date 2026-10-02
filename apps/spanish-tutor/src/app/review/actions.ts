'use server'

import { revalidatePath } from 'next/cache'

import type { Grade } from '@physics/review'
import { container } from '@/container'

/**
 * Grading a review card — the only write path for `/review`. One event per grade, appended to the
 * review log, the same thin-shell-around-a-service shape as `submitExercise` in the root
 * `actions.ts`: validate, append, done. The scheduler itself lives in `@physics/review` and is
 * applied by `reduceReviewEvents` the next time anyone reads `container.review.state()`.
 */
export async function gradeCard(input: { cardId: string; grade: Grade }): Promise<void> {
  const { review, clock, ids } = container

  await review.append({
    v: 1,
    id: ids.next(),
    ts: clock.now().toISOString(),
    type: 'card.graded',
    cardId: input.cardId,
    grade: input.grade,
  })

  revalidatePath('/review')
}
