import { describe, expect, it } from 'vitest'
import { type TopicId } from '@core/domain'
import { FileSystemContentRepository } from '@adapters/content/fs-mdx'
import { FileSystemReviewContentRepository } from '@adapters/content/fs-review'

/**
 * Structural checks on every review deck. Unlike the Chinese and Russian apps there is no
 * pronunciation fixture to cross-check: Spanish spells its own pronunciation, so a card's `front`
 * is already the thing a learner needs to read, and `frontPronunciation` is left unset (or used
 * only for a rare hint). What still has to hold is that every card points at a real topic and at
 * real exercises, and that ids never collide across decks — the big quiz draws distractors across
 * every deck at once, so a duplicate id would silently merge two cards' review state.
 */

describe('review card content', () => {
  it('every exerciseIds entry actually exists in that card\'s topic exercise file', async () => {
    const content = new FileSystemContentRepository()
    const cards = await new FileSystemReviewContentRepository().allDecks()

    const exercisesByTopic = new Map<string, Set<string>>()
    for (const card of cards) {
      if (card.exerciseIds.length === 0) continue
      if (!exercisesByTopic.has(card.topicId)) {
        const exercises = await content.getExercises(card.topicId as TopicId)
        exercisesByTopic.set(card.topicId, new Set(exercises.map((e) => e.id)))
      }
      const known = exercisesByTopic.get(card.topicId)!
      for (const exerciseId of card.exerciseIds) {
        expect(known.has(exerciseId), `card "${card.id}" references unknown exercise "${exerciseId}"`).toBe(true)
      }
    }
  })

  it('every card belongs to a topic that actually exists', async () => {
    const content = new FileSystemContentRepository()
    const allTopics = await content.allTopics()
    const cards = await new FileSystemReviewContentRepository().allDecks()

    for (const card of cards) {
      expect(allTopics.has(card.topicId as TopicId), `card "${card.id}" has unknown topicId "${card.topicId}"`).toBe(
        true,
      )
    }
  })

  it('card ids are unique across every deck', async () => {
    const cards = await new FileSystemReviewContentRepository().allDecks()
    const seen = new Set<string>()
    for (const card of cards) {
      expect(seen.has(card.id), `duplicate card id "${card.id}"`).toBe(false)
      seen.add(card.id)
    }
  })

  it('no two cards share a front — the quiz would otherwise offer two "right" answers', async () => {
    const cards = await new FileSystemReviewContentRepository().allDecks()
    const seen = new Map<string, string>()
    for (const card of cards) {
      const prior = seen.get(card.front)
      expect(prior, `cards "${prior}" and "${card.id}" share the front "${card.front}"`).toBeUndefined()
      seen.set(card.front, card.id)
    }
  })
})
