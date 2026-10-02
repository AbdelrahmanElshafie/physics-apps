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
  'sr-shi-ten': 'shi2',
  'sr-guo': 'guo2',
  'sr-mu': 'mu4',
  'sr-lin': 'lin2',
  'sr-sen': 'sen1',
  'sr-he': 'he2',
  'sr-hai': 'hai3',
  'sr-kou': 'kou3',
  'sr-qing-blue': 'qing1',
  'sr-qing-please': 'qing3',
  'iy-wo': 'wo3',
  'iy-jiao': 'jiao4',
  'iy-shenme': 'shen2 me5',
  'iy-mingzi': 'ming2 zi5',
  'iy-ni-jiao-shenme': 'Ni3 jiao4 shen2 me5 ming2 zi5',
  'iy-wo-jiao': 'Wo3 jiao4 Wang2 Ming2',
  'iy-shi': 'shi4',
  'iy-xuesheng': 'xue2 sheng1',
  'iy-laoshi': 'lao3 shi1',
  'iy-wo-shi-xuesheng': 'Wo3 shi4 xue2 sheng1',
  'iy-zhongguo': 'Zhong1 guo2',
  'iy-zhongguoren': 'Zhong1 guo2 ren2',
  'iy-meiguoren': 'Mei3 guo2 ren2',
  'iy-wo-shi-meiguoren': 'Wo3 shi4 Mei3 guo2 ren2',
  'nm-1': 'yi1',
  'nm-2': 'er4',
  'nm-3': 'san1',
  'nm-4': 'si4',
  'nm-5': 'wu3',
  'nm-6': 'liu4',
  'nm-7': 'qi1',
  'nm-8': 'ba1',
  'nm-9': 'jiu3',
  'nm-10': 'shi2',
  'nm-17': 'shi2 qi1',
  'nm-68': 'liu4 shi2 ba1',
  'nm-99': 'jiu3 shi2 jiu3',
  'nm-liang': 'liang3',
  'pm-ni': 'ni3',
  'pm-ta-he': 'ta1',
  'pm-ta-she': 'ta1',
  'pm-ta-it': 'ta1',
  'pm-women': 'wo3 men5',
  'pm-tamen': 'ta1 men5',
  'pm-ge': 'ge4',
  'pm-ben': 'ben3',
  'pm-zhi': 'zhi1',
  'pm-zhang': 'zhang1',
  'pm-bei': 'bei1',
  'pm-shu': 'shu1',
  'pm-mao': 'mao1',
  'pm-san-ben-shu': 'san1 ben3 shu1',
  'pm-liang-zhi-mao': 'liang3 zhi1 mao1',
  'hay-ni-hao-ma': 'Ni3 hao3 ma5',
  'hay-hen': 'hen3',
  'hay-lei': 'lei4',
  'hay-mang': 'mang2',
  'hay-wo-hen-hao': 'Wo3 hen3 hao3',
  'hay-wo-hen-lei': 'Wo3 hen3 lei4',
  'hay-ta-hen-mang': 'Ta1 hen3 mang2',
  'hay-hai-xing': 'hai2 xing2',
  'hay-bu-tai-hao': 'bu2 tai4 hao3',
  'hay-ni-ne': 'Ni3 ne5',
  'td-zhe': 'zhe4',
  'td-na': 'na4',
  'td-na-which': 'na3',
  'td-de': 'de5',
  'td-wo-de': 'wo3 de5',
  'td-pengyou': 'peng2 you3',
  'td-zhe-ben-shu': 'zhe4 ben3 shu1',
  'td-na-ge-ren': 'na4 ge4 ren2',
  'td-zhe-shi-shenme': 'Zhe4 shi4 shen2 me5',
  'td-na-shi-wo-de-shu': 'Na4 shi4 wo3 de5 shu1',
  'td-laoshi-de-mingzi': 'lao3 shi1 de5 ming2 zi5',
  'td-zhe-shi-wo-de': 'Zhe4 shi4 wo3 de5',
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
