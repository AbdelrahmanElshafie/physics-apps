import { describe, expect, it } from 'vitest'
import { toneMarkPinyin, type TopicId } from '@core/domain'
import { FileSystemContentRepository } from '@adapters/content/fs-mdx'
import { FileSystemReviewContentRepository } from '@adapters/content/fs-review'

/**
 * Same "a mark a lesson prints is a mark a test checks" discipline as `tests/pinyin.test.ts`,
 * applied to review cards: every card's `frontPronunciation` is authored against a raw numbered
 * form here, never hand-typed independently of `toneMarkPinyin`.
 */
const RAW_PRONUNCIATION: Record<string, string> = {
  'greetings-nihao': 'ni3 hao3',
  'greetings-ninhao': 'nin2 hao3',
  'greetings-xiexie': 'xie4 xie5',
  'greetings-bukeqi': 'bu2 ke4 qi5',
  'greetings-duibuqi': 'dui4 bu5 qi3',
  'greetings-buhaoyisi': 'bu4 hao3 yi4 si5',
  'greetings-zaijian': 'zai4 jian4',
  'greetings-sentence-hello-thanks': 'ni3 hao3 xie4 xie5 ni3',
  'greetings-sentence-welcome-bye': 'bu2 ke4 qi5 zai4 jian4',
  'pinyin-and-tones-ma1': 'ma1',
  'pinyin-and-tones-ma2': 'ma2',
  'pinyin-and-tones-ma3': 'ma3',
  'pinyin-and-tones-ma4': 'ma4',
  'pinyin-and-tones-ma5': 'ma5',
  'tone-pairs-nihao-spoken': 'ni2 hao3',
  'tone-pairs-henhao-written': 'hen3 hao3',
  'tone-pairs-henhao-spoken': 'hen2 hao3',
  'tone-pairs-bushi': 'bu2 shi4',
  'tone-pairs-bulai': 'bu4 lai2',
}

describe('review card content', () => {
  it('every card with a pronunciation matches toneMarkPinyin of its raw numbered form', async () => {
    const cards = await new FileSystemReviewContentRepository().allDecks()
    expect(cards.length).toBeGreaterThan(0)

    for (const card of cards) {
      if (!card.frontPronunciation) continue
      const raw = RAW_PRONUNCIATION[card.id]
      expect(raw, `no raw-pinyin fixture registered for card "${card.id}"`).toBeDefined()
      expect(toneMarkPinyin(raw!)).toBe(card.frontPronunciation)
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
