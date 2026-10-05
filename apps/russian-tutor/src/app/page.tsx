import Link from 'next/link'
import { ArrowRight, Check, NotebookPen, RotateCcw, Star } from 'lucide-react'

import { mostRecentTopic, type Syllabus, type TopicId } from '@core/domain'
import { container } from '@/container'
import { Header } from '@/components/layout/Header'
import { posterNumeral, splitTitle } from '@/lib/titles'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * The home page is the course as one path down the page, phase by phase, with every lesson a pill
 * you can walk to.
 *
 * It replaces an earlier poster layout: black-bordered blocks, dense checkbox lists, condensed
 * capitals everywhere. It looked good in a screenshot and was tiring to use. This is the same
 * shape spanish-tutor uses, which reads well — the red, the condensed display face and the big
 * 01–05 numerals are what keep it Russian. The hero's "Continue" card goes to the lesson last
 * actually open — see `mostRecentTopic` — not wherever the syllabus says is next.
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

  // "Continue" means the lesson that was literally last open, not the next unfinished one in
  // the syllabus — the way a game remembers which level you were on rather than suggesting the
  // next one. Falls back to the next-unwritten-unviewed heuristic only on a brand-new course.
  const lastVisited = mostRecentTopic(progress)
  const resumeId = lastVisited && written.has(lastVisited) && syllabus.topics.has(lastVisited) ? lastVisited : nextUp
  const resumeTopic = syllabus.topics.get(resumeId)!
  const resuming = lastVisited !== undefined

  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <main className="pane-scroll flex-1 overflow-y-auto">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-surface">
          {/* A hairline, not a slab — this used to be a solid 40px fill of the accent colour. */}
          <div className="band absolute -left-10 bottom-0 right-[-10%] h-[3px]" aria-hidden />
          <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-14 pt-12 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="poster-caps mb-3 text-xs text-accent">С нуля · from scratch</p>
              <h1 className="poster text-6xl text-fg">
                Русский, <span className="text-accent">с нуля</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">
                Russian, from scratch. The Cyrillic alphabet, stress and vowel reduction, the six
                cases and verb aspect — with real sentences at every step and a tutor who reads
                what you write.
              </p>
              <p className="mt-5 text-sm text-fg-subtle">
                {written.size} of {syllabus.order.length} lessons written · {viewedCount} read
              </p>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3">
              <Link
                href={hrefFor(resumeId)}
                className="group rounded-panel bg-accent px-5 py-4 text-accent-fg shadow-panel transition hover:bg-accent-strong"
              >
                <p className="poster-caps text-[0.65rem] opacity-85">
                  {resuming ? 'Continue with' : 'Start with'}
                </p>
                <p className="poster mt-1.5 flex items-center justify-between gap-3 text-xl">
                  {resumeTopic.title}
                  <ArrowRight className="size-5 shrink-0 transition group-hover:translate-x-1" aria-hidden />
                </p>
              </Link>
              <div className="flex gap-2">
                <PillLink href="/review" icon={RotateCcw} ru="Повторение" en="review" />
                <PillLink href="/practice" icon={NotebookPen} ru="Практика" en="writing" />
              </div>
            </div>
          </div>
        </section>

        {/* The path */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="poster text-3xl text-fg">
            Программа <span className="text-lg font-normal text-fg-subtle">the course</span>
          </h2>
          <p className="mt-1 mb-10 text-sm text-fg-muted">
            Five phases, in order. Each pill is a lesson; dashed ones are on the roadmap but not
            written yet.
          </p>

          <ol className="relative border-l-2 border-border pl-10">
            {syllabus.phases.map((phase, index) => {
              const { number, name } = splitTitle(phase.title)
              const ordinal = posterNumeral(number ? Number(number) : index + 1)
              const topicIds = phase.moduleIds.flatMap((m) => syllabus.modules.get(m)?.topicIds ?? [])
              const phaseDone = topicIds.length > 0 && topicIds.every(viewed)
              return (
                <li key={phase.id} className={cn('relative', index < syllabus.phases.length - 1 && 'pb-10')}>
                  {/* Done is ink-filled, not a second hue — the cobalt accent stays reserved for
                      the primary action and small marks, not repeated five times down the path. */}
                  <span
                    className={cn(
                      'poster absolute -left-[3.6rem] top-0 flex size-11 items-center justify-center rounded-lg text-base shadow-panel',
                      phaseDone ? 'bg-ink text-ink-fg' : 'bg-accent-muted text-accent-strong',
                    )}
                    aria-hidden
                  >
                    {phaseDone ? <Check className="size-5" strokeWidth={3} /> : ordinal}
                  </span>

                  <div className="rounded-panel border border-border bg-surface px-6 py-5 shadow-panel">
                    <p className="poster-caps text-[0.65rem] text-accent">Фаза {ordinal}</p>
                    <h3 className="poster mt-0.5 text-xl text-fg">{name}</h3>
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
      {/*
       * Three states, one hue. Unwritten is dashed and quiet; written is a plain neutral outline
       * — a lesson existing isn't an achievement, so it gets no colour; read is solid ink, the
       * same "settled" fill the phase marker above uses. No second hue competes with the cobalt
       * accent here, which is what made the red/green pairing in the first pass clash.
       */}
      <Link
        href={hrefFor(topicId)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition',
          viewed
            ? 'border-ink bg-ink text-ink-fg hover:opacity-90'
            : written
              ? 'border-border-strong bg-surface text-fg-muted hover:border-fg-subtle hover:text-fg'
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

function PillLink({ href, icon: Icon, ru, en }: { href: string; icon: typeof RotateCcw; ru: string; en: string }) {
  return (
    <Link
      href={href}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm transition hover:border-accent/50 hover:bg-accent-muted"
    >
      <Icon className="size-4 shrink-0 text-accent" aria-hidden />
      <span className="poster text-sm text-fg">{ru}</span>
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
