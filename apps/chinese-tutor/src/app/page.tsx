import Link from 'next/link'
import { ArrowRight, Check, NotebookPen, RotateCcw, Star } from 'lucide-react'

import type { Syllabus, TopicId } from '@core/domain'
import { container } from '@/container'
import { Header } from '@/components/layout/Header'
import { hanziNumeral, splitTitle } from '@/lib/titles'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * The home page is 学习之路 — the course as one path down the page, volume by volume, with every
 * lesson a pill you can walk to.
 *
 * It replaces an earlier table-of-contents layout that imitated a printed book: dotted leaders,
 * small grey type, a vertical spine eating a third of the width. It was faithful and hard to use.
 * This is the same shape spanish-tutor uses, which reads well — the Song serif, the seal and the
 * 卷 numbering are what keep it Chinese.
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
        <section className="relative overflow-hidden border-b border-border bg-surface">
          <div
            className="pointer-events-none absolute -right-10 top-0 select-none font-display text-[13rem] font-black leading-none text-accent/[0.06]"
            aria-hidden
          >
            学
          </div>
          <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="mb-3 text-sm font-bold tracking-[0.2em] text-accent">从零开始 · from scratch</p>
              <h1 className="font-display text-5xl font-black leading-[1.1] text-fg">
                中文, <span className="text-accent">一步一步</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">
                Mandarin, from scratch. Pinyin and the tones, the writing system, measure words and
                the grammar spine — with real sentences at every step and a tutor who reads what
                you write.
              </p>
              <p className="mt-5 text-sm text-fg-subtle">
                {written.size} of {syllabus.order.length} lessons written · {viewedCount} read
              </p>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3">
              <Link
                href={hrefFor(nextUp)}
                className="group rounded-panel bg-accent px-5 py-4 text-accent-fg shadow-panel transition hover:bg-accent-strong"
              >
                <p className="text-xs font-bold tracking-wider opacity-80">
                  {viewed(nextUp) ? '重读 · Start again from' : viewedCount > 0 ? '继续 · Continue with' : '开始 · Start with'}
                </p>
                <p className="mt-1 flex items-center justify-between gap-3 font-display text-xl font-bold">
                  {nextTopic.title}
                  <ArrowRight className="size-5 shrink-0 transition group-hover:translate-x-1" aria-hidden />
                </p>
              </Link>
              <div className="flex gap-2">
                <PillLink href="/review" icon={RotateCcw} zh="复习" en="review" />
                <PillLink href="/practice" icon={NotebookPen} zh="练习" en="writing" />
              </div>
            </div>
          </div>
        </section>

        {/* 学习之路 — the path */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="font-display text-2xl font-bold text-fg">
            学习之路 <span className="text-base font-normal text-fg-subtle">the path</span>
          </h2>
          <p className="mt-1 mb-10 text-sm text-fg-muted">
            Five volumes, in order. Each pill is a lesson; dashed ones are on the roadmap but not
            written yet.
          </p>

          <ol className="relative border-l-2 border-accent/25 pl-10">
            {syllabus.phases.map((phase, index) => {
              const { number, name } = splitTitle(phase.title)
              const volume = hanziNumeral(number ? Number(number) : index + 1)
              const topicIds = phase.moduleIds.flatMap((m) => syllabus.modules.get(m)?.topicIds ?? [])
              const phaseDone = topicIds.length > 0 && topicIds.every(viewed)
              return (
                <li key={phase.id} className={cn('relative', index < syllabus.phases.length - 1 && 'pb-10')}>
                  <span
                    className={cn(
                      'absolute -left-[3.35rem] top-0 flex size-10 items-center justify-center rounded-lg font-display text-lg font-bold shadow-panel',
                      phaseDone ? 'bg-jade text-accent-fg' : 'seal',
                    )}
                    aria-hidden
                  >
                    {phaseDone ? <Check className="size-5" strokeWidth={3} /> : volume}
                  </span>

                  <div className="rounded-panel border border-border bg-surface px-6 py-5 shadow-panel">
                    <p className="font-display text-sm font-bold text-accent">卷{volume}</p>
                    <h3 className="mt-0.5 font-display text-xl font-bold text-fg">{name}</h3>
                    {phase.summary && <p className="mt-1 text-sm text-fg-muted">{phase.summary}</p>}

                    <div className="mt-4 space-y-4">
                      {phase.moduleIds.map((moduleId) => {
                        const mod = syllabus.modules.get(moduleId)
                        if (!mod) return null
                        return (
                          <div key={moduleId}>
                            <p className="mb-2 text-xs font-semibold text-fg-subtle">{splitTitle(mod.title).name}</p>
                            <ul className="flex flex-wrap gap-2">
                              {mod.topicIds.map((topicId) => (
                                <TopicPill
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
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </main>
    </div>
  )
}

function TopicPill({
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
          'flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition',
          viewed
            ? 'border-jade/40 bg-jade-muted text-jade hover:border-jade'
            : written
              ? 'border-accent/40 bg-surface text-accent-strong hover:bg-accent-muted'
              : 'border-dashed border-border-strong bg-transparent font-normal text-fg-subtle hover:text-fg',
        )}
        title={topic.summary}
      >
        {viewed && <Check className="size-3.5" aria-hidden />}
        {topic.critical && !viewed && <Star className="size-3.5 fill-accent text-accent" aria-hidden />}
        {topic.title}
      </Link>
    </li>
  )
}

function PillLink({ href, icon: Icon, zh, en }: { href: string; icon: typeof RotateCcw; zh: string; en: string }) {
  return (
    <Link
      href={href}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm transition hover:border-accent/50 hover:bg-accent-muted"
    >
      <Icon className="size-4 text-accent" aria-hidden />
      <span className="font-display font-bold text-fg">{zh}</span>
      <span className="text-fg-subtle">{en}</span>
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
