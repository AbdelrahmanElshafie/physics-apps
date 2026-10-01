import { describe, expect, it } from 'vitest'
import { markStress, type TopicId } from '@core/domain'
import { FileSystemContentRepository } from '@adapters/content/fs-mdx'
import { FileSystemReviewContentRepository } from '@adapters/content/fs-review'

/**
 * Same "a mark a lesson prints is a mark a test checks" discipline as `tests/stress.test.ts`,
 * applied to review cards: every card's `frontPronunciation` is authored against a raw
 * apostrophe-marked form here, never hand-typed independently of `markStress`.
 */
const RAW_STRESS: Record<string, string> = {
  'cyrillic-alphabet-mama': "ма'ма",
  'greetings-privet': "приве'т",
  'greetings-zdravstvuyte': "здра'вствуйте",
  'greetings-spasibo': "спаси'бо",
  'greetings-pozhaluysta': "пожа'луйста",
  'greetings-izvinite': "извини'те",
  'greetings-do-svidaniya': "до свида'ния",
  'greetings-poka': "пока'",
  'greetings-sentence-hi-thanks': "Приве'т! Спаси'бо!",
  'greetings-sentence-welcome-bye': "Пожа'луйста. Пока'!",
  'stress-zamok-castle': "за'мок",
  'stress-zamok-lock': "замо'к",
  'stress-moloko': "молоко'",
  'stress-horosho': "хорошо'",
  'stress-zemlya': "земля'",
}

describe('review card content', () => {
  it('every card with a pronunciation matches markStress of its raw apostrophe-marked form', async () => {
    const cards = await new FileSystemReviewContentRepository().allDecks()
    expect(cards.length).toBeGreaterThan(0)

    for (const card of cards) {
      if (!card.frontPronunciation) continue
      const raw = RAW_STRESS[card.id]
      expect(raw, `no raw-stress fixture registered for card "${card.id}"`).toBeDefined()
      expect(markStress(raw!)).toBe(card.frontPronunciation)
    }
  })

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
})
