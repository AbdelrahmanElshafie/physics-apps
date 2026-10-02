import Link from 'next/link'
import { ArrowRight, Check, NotebookPen, RotateCcw } from 'lucide-react'

import type { Syllabus, TopicId } from '@core/domain'
import { container } from '@/container'
import { Header } from '@/components/layout/Header'
import { posterNumeral, splitTitle } from '@/lib/titles'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * The home page is a poster. A hero with the course name in condensed capitals across a red
 * diagonal band, the next unread lesson as a black block beside it, and below that the five
 * phases as big numbered blocks — 01 to 05 — each listing its lessons with a square marker:
 * filled red for written, hollow for still on the roadmap, black with a tick for read.
 */
export default async function HomePage() {
  const [syllabi, progress] = await Promise.all([container.content.listSyllabi(), container.progress.state()])
  const syllabus = syllabi[0]
  if (!syllabus) return <EmptyCourse />

  const written = new Set<TopicId>()
  await Promise.all(
    syllabus.order.map(async (id) => {
      if ((await container.content.getLesson(id)) !== null) written.add(id)
    }),
  )
  const viewed = (id: TopicId) => progress.topics.get(id)?.viewed ?? false
  const viewedCount = syllabus.order.filter(viewed).length
  const nextUp = syllabus.order.find((id) => written.has(id) && !viewed(id)) ?? syllabus.order[0]!
  const nextTopic = syllabus.topics.get(nextUp)!

  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <main className="pane-scroll flex-1 overflow-y-auto">
        {/* Hero */}
        <section className="relative overflow-hidden border-b-2 border-ink bg-surface">
          {/* The band is a diagonal divider along the hero's bottom edge, not a wash behind it —
              skewed red under running text is unreadable, so nothing sits on top of it. */}
          <div className="band absolute -left-10 bottom-0 right-[-10%] h-12" aria-hidden />
          <div className="relative mx-auto grid max-w-5xl gap-8 px-6 pb-28 pt-10 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="poster text-sm tracking-[0.3em] text-accent">С нуля · from scratch</p>
              <h1 className="poster mt-2 text-[6rem] text-fg md:text-[8rem]">Русский</h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-fg-muted">
                Russian, from scratch. The alphabet, stress, the case system, verb aspect — real
                sentences at every step, and a tutor who reads what you write.
              </p>
              <p className="poster mt-4 text-xs tracking-[0.2em] text-fg-subtle">
                {written.size} / {syllabus.order.length} lessons written · {viewedCount} read
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 md:w-80">
              <Link
                href={hrefFor(nextUp)}
                className="group border-2 border-ink bg-ink px-5 py-4 text-ink-fg shadow-panel transition hover:bg-accent hover:border-accent"
              >
                <p className="poster text-xs tracking-[0.2em] text-ink-fg/60 group-hover:text-accent-fg/80">
                  {viewed(nextUp) ? 'Start again from' : viewedCount > 0 ? 'Continue with' : 'Start with'}
                </p>
                <p className="poster mt-1.5 flex items-center justify-between gap-3 text-2xl">
                  {nextTopic.title}
                  <ArrowRight className="size-6 shrink-0 transition group-hover:translate-x-1" aria-hidden />
                </p>
              </Link>
              <div className="flex gap-3">
                <BlockLink href="/review" icon={RotateCcw} ru="Повторение" en="review" />
                <BlockLink href="/practice" icon={NotebookPen} ru="Практика" en="practice" />
              </div>
            </div>
          </div>
        </section>

        {/* Phases */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="poster text-3xl text-fg">
            Программа <span className="text-fg-subtle">· the course</span>
          </h2>
          <p className="mt-1 mb-8 text-sm text-fg-muted">
            Five phases in order. A red square is a written lesson, a hollow one is still on the
            roadmap, a black one you have read.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {syllabus.phases.map((phase, index) => {
              const { number, name } = splitTitle(phase.title)
              const topicIds = phase.moduleIds.flatMap((m) => syllabus.modules.get(m)?.topicIds ?? [])
              const readCount = topicIds.filter(viewed).length
              const isLast = index === syllabus.phases.length - 1 && syllabus.phases.length % 2 === 1
              return (
                <article
                  key={phase.id}
                  className={cn('border-2 border-ink bg-surface shadow-panel', isLast && 'md:col-span-2')}
                >
                  <header className="flex items-start gap-4 border-b-2 border-ink px-5 py-4">
                    <span className="poster text-5xl leading-none text-accent">
                      {posterNumeral(number ? Number(number) : index + 1)}
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <h3 className="poster text-xl text-fg">{name}</h3>
                      {phase.summary && <p className="mt-1 text-sm leading-snug text-fg-muted">{phase.summary}</p>}
                    </div>
                    <span className="poster shrink-0 pt-1 text-xs tracking-[0.15em] text-fg-subtle">
                      {readCount}/{topicIds.length}
                    </span>
                  </header>

                  <div className={cn('px-5 py-4', isLast && 'md:columns-2 md:gap-8')}>
                    {phase.moduleIds.map((moduleId) => {
                      const mod = syllabus.modules.get(moduleId)
                      if (!mod) return null
                      return (
                        <div key={moduleId} className="mb-4 break-inside-avoid last:mb-0">
                          <p className="poster mb-1.5 text-[0.7rem] tracking-[0.15em] text-fg-subtle">
                            {splitTitle(mod.title).name}
                          </p>
                          <ul className="space-y-1">
                            {mod.topicIds.map((topicId) => (
                              <TopicRow
                                key={topicId}
                                syllabus={syllabus}
                                topicId={topicId}
                                written={written.has(topicId)}
                                viewed={viewed(topicId)}
                              />
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

function TopicRow({
  syllabus,
  topicId,
  written,
  viewed,
}: {
  syllabus: Syllabus
  topicId: TopicId
  written: boolean
  viewed: boolean
}) {
  const topic = syllabus.topics.get(topicId)
  if (!topic) return null
  return (
    <li>
      <Link
        href={hrefFor(topicId)}
        className={cn(
          'group flex items-center gap-2.5 py-0.5 text-sm transition-colors',
          written ? 'text-fg hover:text-accent-strong' : 'text-fg-subtle hover:text-fg',
        )}
        title={topic.summary}
      >
        <span
          className={cn(
            'flex size-3.5 shrink-0 items-center justify-center border-2',
            viewed ? 'border-ink bg-ink text-ink-fg' : written ? 'border-accent bg-accent' : 'border-border-strong',
          )}
          aria-hidden
        >
          {viewed && <Check className="size-2.5" strokeWidth={4} />}
        </span>
        <span className={cn(written && 'font-medium')}>{topic.title}</span>
        {topic.critical && <span className="poster text-[0.6rem] tracking-[0.15em] text-accent">важно</span>}
      </Link>
    </li>
  )
}

function BlockLink({ href, icon: Icon, ru, en }: { href: string; icon: typeof RotateCcw; ru: string; en: string }) {
  return (
    <Link
      href={href}
      className="flex flex-1 items-center justify-center gap-2 border-2 border-ink bg-surface px-3 py-2.5 shadow-panel transition hover:bg-accent-muted"
    >
      <Icon className="size-4 text-accent" aria-hidden />
      <span className="poster text-sm">{ru}</span>
      <span className="text-xs text-fg-subtle">{en}</span>
    </Link>
  )
}

function hrefFor(topicId: TopicId): string {
  const at = topicId.indexOf(':')
  return `/lesson/${topicId.slice(0, at)}/${topicId.slice(at + 1)}`
}

function EmptyCourse() {
  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <p className="text-sm text-fg-muted">No syllabus found under content/syllabi.</p>
      </main>
    </div>
  )
}
