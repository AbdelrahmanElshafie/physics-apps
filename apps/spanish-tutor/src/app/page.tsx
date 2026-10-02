import Link from 'next/link'
import { ArrowRight, Check, NotebookPen, RotateCcw, Star } from 'lucide-react'

import type { Syllabus, TopicId } from '@core/domain'
import { container } from '@/container'
import { Header } from '@/components/layout/Header'
import { splitTitle } from '@/lib/titles'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * The home page is "el camino" — the whole course drawn as one road down the page, phase by
 * phase, with every topic as a pill you can walk to. Written lessons are solid, unwritten ones
 * are dashed outlines (the roadmap is real even where the content isn't yet), and the next
 * unread lesson is pulled out into the hero so a returning student never has to find their place.
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
          <div className="azulejo absolute inset-y-0 right-0 w-1/3 opacity-30 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-azul">Un curso personal</p>
              <h1 className="font-display text-5xl font-semibold leading-[1.05] text-fg">
                Español, <em className="text-accent">desde cero</em>.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">
                Spanish, from scratch. Sounds and spelling, gender, ser and estar, the verb tables —
                with real sentences at every step and a tutor who reads what you write.
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
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                  {viewed(nextUp) ? 'Start again from' : viewedCount > 0 ? 'Continue with' : 'Start with'}
                </p>
                <p className="mt-1 flex items-center justify-between gap-3 font-display text-xl font-semibold">
                  {nextTopic.title}
                  <ArrowRight className="size-5 shrink-0 transition group-hover:translate-x-1" aria-hidden />
                </p>
              </Link>
              <div className="flex gap-2">
                <PillLink href="/review" icon={RotateCcw} label="Repaso" sub="review" />
                <PillLink href="/practice" icon={NotebookPen} label="Práctica" sub="writing" />
              </div>
            </div>
          </div>
        </section>

        {/* El camino */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="font-display text-2xl font-semibold text-fg">El camino</h2>
          <p className="mt-1 mb-10 text-sm text-fg-muted">
            Five phases, in order. Each pill is a lesson; dashed ones are on the roadmap but not
            written yet.
          </p>

          <ol className="relative border-l-2 border-azul/30 pl-10">
            {syllabus.phases.map((phase, index) => {
              const { number, name } = splitTitle(phase.title)
              const topicIds = phase.moduleIds.flatMap((m) => syllabus.modules.get(m)?.topicIds ?? [])
              const phaseDone = topicIds.length > 0 && topicIds.every(viewed)
              return (
                <li key={phase.id} className={cn('relative', index < syllabus.phases.length - 1 && 'pb-10')}>
                  <span
                    className={cn(
                      'absolute -left-[3.35rem] top-0 flex size-10 items-center justify-center rounded-full border-2 font-display text-base font-bold shadow-panel',
                      phaseDone
                        ? 'border-success bg-success text-accent-fg'
                        : 'border-azul bg-surface text-azul',
                    )}
                    aria-hidden
                  >
                    {phaseDone ? <Check className="size-5" /> : (number ?? index + 1)}
                  </span>

                  <div className="rounded-panel border border-border bg-surface px-6 py-5 shadow-panel">
                    <p className="text-xs font-bold uppercase tracking-wider text-azul">
                      {number ? `Fase ${number}` : 'Fase'}
                    </p>
                    <h3 className="mt-0.5 font-display text-xl font-semibold text-fg">{name}</h3>
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
          'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition',
          viewed
            ? 'border-success/40 bg-success-muted text-success hover:border-success'
            : written
              ? 'border-accent/40 bg-surface text-accent-strong hover:bg-accent-muted'
              : 'border-dashed border-border-strong bg-transparent font-normal text-fg-subtle hover:text-fg',
        )}
        title={topic.summary}
      >
        {viewed && <Check className="size-3.5" aria-hidden />}
        {topic.critical && !viewed && <Star className="size-3.5 fill-sol text-sol" aria-hidden />}
        {topic.title}
      </Link>
    </li>
  )
}

function PillLink({ href, icon: Icon, label, sub }: { href: string; icon: typeof RotateCcw; label: string; sub: string }) {
  return (
    <Link
      href={href}
      className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-fg transition hover:border-accent/50 hover:bg-accent-muted"
    >
      <Icon className="size-4 text-accent" aria-hidden />
      {label}
      <span className="font-normal text-fg-subtle">· {sub}</span>
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
