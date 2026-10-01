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
  'gender-okno': "окно'",
  'gender-semya': "семья'",
  'gender-papa': "па'па",
  'gender-muzhchina': "мужчи'на",
  'gender-palto': "пальто'",
  'gender-metro': "метро'",
  'cases-sobaka-kusaet': "Соба'ка куса'ет мужчи'ну.",
  'cases-muzhchina-nom': "мужчи'на",
  'cases-muzhchina-acc': "мужчи'ну",
  'nom-student': "студе'нт",
  'nom-student-chitaet': "Студе'нт чита'ет.",
  'nom-eto-stol': "Э'то стол.",
  'nom-knigi': "кни'ги",
  'nom-okna': "о'кна",
  'acc-knigu': "кни'гу",
  'acc-semyu': "семью'",
  'acc-studenta': "студе'нта",
  'acc-okno': "окно'",
  'acc-gazetu': "газе'ту",
  'acc-ya-vizhu-stol': "Я ви'жу стол.",
  'acc-ya-vizhu-studenta': "Я ви'жу студе'нта.",
  'gen-knigi': "кни'ги",
  'gen-kniga-studenta': "Э'то кни'га студе'нта.",
  'gen-doma': "до'ма",
  'gen-vody': "воды'",
  'gen-stakan-vody': "стака'н воды'",
  'gen-u-tebya-est-kniga': "У тебя' есть кни'га?",
  'gen-u-menya-net-knigi': "У меня' нет кни'ги.",
  'di-ya-dayu': "Я даю' кни'гу студе'нту.",
  'di-tebe': "тебе'",
  'di-mne-nravitsya-kniga': "Мне нра'вится кни'га.",
  'di-tebe-nravitsya-chay': "Тебе' нра'вится чай?",
  'di-knigoy': "кни'гой",
  'di-ya-pishu-ruchkoy': "Я пишу' ру'чкой.",
  'di-ya-idu-s-drugom': "Я иду' с дру'гом.",
  'prep-stole': "столе'",
  'prep-kniga-v-dome': "Кни'га в до'ме.",
  'prep-kniga-na-stole': "Кни'га на столе'.",
  'prep-knige': "кни'ге",
  'prep-na-rabote': "на рабо'те",
  'prep-okne': "окне'",
  'prep-o-knige': "Я ду'маю о кни'ге.",
  'intro-menya-zovut': "Меня' зову'т А'нна.",
  'intro-iz-rossii': "из Росси'и",
  'intro-ya-iz-ameriki': "Я из Аме'рики.",
  'intro-byla': "была'",
  'ptc-chitayu': "чита'ю",
  'ptc-govorish': "говори'шь",
  'ptc-ty-govorish-po-russki': "Ты говори'шь по-ру'сски?",
  'va-ya-chital': "Я чита'л кни'гу всё у'тро.",
  'va-prochitayu': "прочита'ю",
  'va-prochital': "прочита'л",
  'va-ya-budu-chitat': "Я бу'ду чита'ть кни'гу.",
  'pt-chital': "чита'л",
  'pt-chitala': "чита'ла",
  'pt-govorili': "говори'ли",
  'pt-bylo': "бы'ло",
  'pt-eto-bylo-horosho': "Э'то бы'ло хорошо'.",
  'ft-budu': "бу'ду",
  'ft-budesh': "бу'дешь",
  'ft-budut': "бу'дут",
  'ft-ya-budu-chitat': "Я бу'ду чита'ть.",
  'ft-prochitayu': "прочита'ю",
  'ft-oni-budut-govorit': "Они' бу'дут говори'ть.",
  'ft-ya-prochitayu-etu-knigu': "Я прочита'ю э'ту кни'гу.",
  'wo-ya-chitayu-knigu': "Я чита'ю кни'гу.",
  'wo-knigu-chitayu-ya': "Кни'гу чита'ю я.",
  'wo-mat-lyubit-doch': "Мать лю'бит дочь.",
  'wo-krasnaya-kniga': "кра'сная кни'га",
  'wo-kniga-krasnaya': "Кни'га кра'сная.",
  'ng-ya-ne-chitayu': "Я не чита'ю.",
  'ng-nichego': "ничего'",
  'ng-ya-nichego-ne-znayu': "Я ничего' не зна'ю.",
  'ng-nikto-ne-znaet': "Никто' не зна'ет.",
  'ng-nikogda': "никогда'",
  'ng-ya-nikogda-ne-byl': "Я никогда' не был в Москве'.",
  'qr-kuda': "куда'",
  'qr-pochemu': "почему'",
  'qr-skolko': "ско'лько",
  'qr-kak-dela': "Как дела'?",
  'qr-ona-chitaet-knigu': "Она' чита'ет кни'гу?",
  'qr-kogo-ty-vidish': "Кого' ты ви'дишь?",
  'qr-komu-ty-dayosh': "Кому' ты даёшь кни'гу?",
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
