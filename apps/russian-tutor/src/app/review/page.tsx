import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Flame, GraduationCap, Layers, ListChecks, Repeat, Sparkles } from 'lucide-react'

import { freshCardState, isDue, isLapsed, isNew, type ReviewCard } from '@physics/review'
import { parseTopicId, type TopicId } from '@core/domain'
import { container } from '@/container'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Review · Russian, from scratch' }

const MASTERED_MIN_REPETITIONS = 3
const MASTERED_MIN_INTERVAL_DAYS = 21

export default async function ReviewPage() {
  const { reviewContent, review, progress, content } = container

  const [cards, reviewState, progressState, syllabi] = await Promise.all([
    reviewContent.allDecks(),
    review.state(),
    progress.state(),
    content.listSyllabi(),
  ])

  const now = new Date()
  const stateFor = (card: ReviewCard) => reviewState.cards.get(card.id) ?? freshCardState(card.id)

  const newCards = cards.filter((c) => isNew(stateFor(c)))
  const dueCards = cards.filter((c) => !isNew(stateFor(c)) && isDue(stateFor(c), now))
  const mistakeCards = cards.filter((c) => isLapsed(stateFor(c)))
  const masteredCards = cards.filter((c) => {
    const s = stateFor(c)
    return (
      !isNew(s) && s.repetitions >= MASTERED_MIN_REPETITIONS && s.intervalDays >= MASTERED_MIN_INTERVAL_DAYS
    )
  })

  // A vocab mistake already shows up as a card above — this list is everything else (grammar,
  // concept questions) that `pnpm tutor profile` already surfaces on the command line, now here too.
  const cardLinkedExerciseIds = new Set(cards.flatMap((c) => c.exerciseIds))
  const titles = new Map<string, string>()
  for (const syllabus of syllabi) {
    for (const [id, topic] of syllabus.topics) titles.set(String(id), topic.title)
  }

  const exerciseMistakes: { topicId: string; exerciseId: string; title: string; href: string }[] = []
  for (const [topicId, topic] of progressState.topics) {
    for (const ex of topic.exercises.values()) {
      if (cardLinkedExerciseIds.has(ex.exerciseId)) continue
      const settled = ex.tutorVerdict ?? (ex.autoVerdict === 'correct' ? 'correct' : ex.autoVerdict)
      if (settled === 'correct') continue
      const { syllabus, local } = parseTopicId(topicId as TopicId)
      exerciseMistakes.push({
        topicId: String(topicId),
        exerciseId: ex.exerciseId,
        title: titles.get(String(topicId)) ?? String(topicId),
        href: `/lesson/${syllabus}/${local}#exercise-${ex.exerciseId}`,
      })
    }
  }

  const dueOrNewCount = dueCards.length + newCards.length
  const mistakesTotal = mistakeCards.length + exerciseMistakes.length

  const stat = (label: string, value: number, Icon: typeof Layers) => (
    <div className="flex flex-col gap-1 rounded-panel border border-border bg-surface px-4 py-3 shadow-panel">
      <p className="poster-caps flex items-center gap-1.5 text-[0.65rem] text-fg-subtle">
        <Icon className="size-3.5 text-accent" aria-hidden />
        {label}
      </p>
      <p className="poster text-4xl text-fg">{value}</p>
    </div>
  )

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to lessons
      </Link>

      <h1 className="poster mt-4 text-4xl text-fg">Повторение <span className="text-lg font-normal text-fg-subtle">· Review</span></h1>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
        Every letter, word, and sentence you&apos;ve studied, scheduled with spaced repetition —
        cards you keep getting wrong come back sooner, cards you know well come back less often.
      </p>

      {cards.length === 0 ? (
        <div className="mt-8 rounded-panel border border-dashed border-border px-6 py-12 text-center">
          <Layers className="mx-auto size-6 text-fg-subtle" aria-hidden />
          <p className="mt-3 text-sm font-medium text-fg">No review cards yet.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
            Open a lesson first — review decks fill in as you work through topics.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {stat('New', newCards.length, Sparkles)}
            {stat('Due', dueCards.length, Repeat)}
            {stat('Mistakes', mistakesTotal, Flame)}
            {stat('Mastered', masteredCards.length, GraduationCap)}
          </div>

          <div className="mt-6 space-y-2.5">
            <Link
              href="/review/session?mode=due"
              className={`flex items-center justify-between gap-4 rounded-panel border px-4 py-3.5 transition-colors ${
                dueOrNewCount > 0
                  ? 'border-accent/40 bg-accent-muted/15 hover:border-accent'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <div>
                <p className="font-medium text-fg">Review</p>
                <p className="text-sm text-fg-subtle">
                  {dueOrNewCount > 0
                    ? `${dueOrNewCount} card${dueOrNewCount === 1 ? '' : 's'} due or new`
                    : 'Nothing due right now — check back later'}
                </p>
              </div>
              <Repeat className="size-5 shrink-0 text-accent" aria-hidden />
            </Link>

            <Link
              href="/review/session?mode=mistakes"
              className={`flex items-center justify-between gap-4 rounded-panel border px-4 py-3.5 transition-colors ${
                mistakesTotal > 0
                  ? 'border-danger/40 bg-danger-muted/10 hover:border-danger'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <div>
                <p className="font-medium text-fg">Practice mistakes</p>
                <p className="text-sm text-fg-subtle">
                  {mistakesTotal > 0
                    ? `${mistakesTotal} item${mistakesTotal === 1 ? '' : 's'} to work on`
                    : 'Nothing outstanding right now'}
                </p>
              </div>
              <Flame className="size-5 shrink-0 text-danger" aria-hidden />
            </Link>

            <Link
              href="/review/quiz"
              className="flex items-center justify-between gap-4 rounded-panel border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong"
            >
              <div>
                <p className="font-medium text-fg">Big quiz</p>
                <p className="text-sm text-fg-subtle">
                  Every card from every lesson you&apos;ve reached, {cards.length} in all
                </p>
              </div>
              <ListChecks className="size-5 shrink-0 text-fg-subtle" aria-hidden />
            </Link>
          </div>

          {exerciseMistakes.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-subtle">
                Grammar and concept questions still open
              </h2>
              <ul className="space-y-1.5">
                {exerciseMistakes.map((m) => (
                  <li key={`${m.topicId}-${m.exerciseId}`}>
                    <Link
                      href={m.href}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm transition-colors hover:border-accent"
                    >
                      <span className="text-fg">{m.title}</span>
                      <span className="shrink-0 text-xs text-fg-subtle">{m.exerciseId}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  )
}
