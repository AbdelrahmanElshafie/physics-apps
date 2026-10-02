import Link from 'next/link'
import { ArrowRight, NotebookPen, RotateCcw } from 'lucide-react'

import type { Syllabus, TopicId } from '@core/domain'
import { container } from '@/container'
import { Header } from '@/components/layout/Header'
import { hanziNumeral, splitTitle } from '@/lib/titles'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * The home page is a book's 目录 — table of contents. A vertical spine on the left carries the
 * course title the way a Chinese book carries it down its edge; the right is the contents proper:
 * each phase a 卷 (volume), each lesson a numbered line with dotted leaders out to its reading
 * time. Written lessons are in ink, unwritten ones greyed with 未写; read ones get a jade mark.
 * The next unread lesson sits at the top under a seal so a returning student finds their place.
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

  let running = 0

  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <main className="pane-scroll flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-5xl grid-cols-[auto_1fr] gap-10 px-6 py-10">
          {/* Spine */}
          <aside className="flex flex-col items-center gap-6 border-r border-border-strong pr-8">
            <span className="seal size-14 text-3xl" aria-hidden>
              学
            </span>
            <p className="vertical-rl font-display text-4xl font-black leading-none tracking-[0.15em] text-fg">
              从零开始学中文
            </p>
            <p className="vertical-rl-latin text-xs tracking-[0.25em] text-fg-subtle">Mandarin, from scratch</p>
          </aside>

          {/* Contents */}
          <div className="paper min-w-0 border border-border px-8 py-8 shadow-panel">
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-fg pb-6">
              <div>
                <p className="font-display text-3xl font-bold text-fg">
                  目录 <span className="text-base font-normal text-fg-subtle">Contents</span>
                </p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
                  Sounds, characters, grammar, and real sentences — in reading order, with a tutor
                  who reads what you write.
                </p>
                <p className="mt-2 text-xs text-fg-subtle">
                  {written.size} of {syllabus.order.length} lessons written · {viewedCount} read
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  href={hrefFor(nextUp)}
                  className="group flex items-center gap-3 border border-accent bg-accent px-4 py-3 text-accent-fg transition hover:bg-accent-strong"
                >
                  <span className="font-display text-lg font-bold">继续</span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[0.65rem] uppercase tracking-wider opacity-80">
                      {viewed(nextUp) ? 'Start again from' : viewedCount > 0 ? 'Continue with' : 'Start with'}
                    </span>
                    <span className="font-medium">{nextTopic.title}</span>
                  </span>
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
                </Link>
                <div className="flex gap-2">
                  <SmallLink href="/review" icon={RotateCcw} zh="复习" en="review" />
                  <SmallLink href="/practice" icon={NotebookPen} zh="练习" en="practice" />
                </div>
              </div>
            </div>

            {syllabus.phases.map((phase, phaseIndex) => {
              const { number, name } = splitTitle(phase.title)
              const volume = hanziNumeral(number ? Number(number) : phaseIndex + 1)
              return (
                <section key={phase.id} className="mt-8">
                  <h2 className="flex items-baseline gap-3">
                    <span className="font-display text-xl font-bold text-accent">卷{volume}</span>
                    <span className="font-display text-xl font-bold text-fg">{name}</span>
                  </h2>
                  {phase.summary && <p className="mt-1 text-sm text-fg-muted">{phase.summary}</p>}

                  {phase.moduleIds.map((moduleId) => {
                    const mod = syllabus.modules.get(moduleId)
                    if (!mod) return null
                    return (
                      <div key={moduleId} className="mt-4">
                        <p className="mb-1.5 text-xs font-medium tracking-wide text-fg-subtle">{splitTitle(mod.title).name}</p>
                        <ol>
                          {mod.topicIds.map((topicId) => {
                            running += 1
                            return (
                              <ContentsLine
                                key={topicId}
                                syllabus={syllabus}
                                topicId={topicId}
                                ordinal={running}
                                written={written.has(topicId)}
                                viewed={viewed(topicId)}
                              />
                            )
                          })}
                        </ol>
                      </div>
                    )
                  })}
                </section>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

function ContentsLine({
  syllabus,
  topicId,
  ordinal,
  written,
  viewed,
}: {
  syllabus: Syllabus
  topicId: TopicId
  ordinal: number
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
          'group flex items-baseline gap-3 py-1.5 text-sm transition-colors',
          written ? 'text-fg hover:text-accent-strong' : 'text-fg-subtle hover:text-fg',
        )}
        title={topic.summary}
      >
        <span className="w-7 shrink-0 font-display text-base font-bold text-accent">{hanziNumeral(ordinal)}</span>
        <span className={cn('shrink-0', !written && 'font-normal')}>
          {topic.title}
          {topic.critical && <span className="ml-1.5 text-xs text-accent">重点</span>}
        </span>
        <span className="mb-1 min-w-4 flex-1 border-b border-dotted border-border-strong" aria-hidden />
        <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
          {viewed ? (
            <span className="font-display font-bold text-jade">已读</span>
          ) : written ? (
            `${topic.estimatedMinutes ?? '–'} min`
          ) : (
            '未写'
          )}
        </span>
      </Link>
    </li>
  )
}

function SmallLink({ href, icon: Icon, zh, en }: { href: string; icon: typeof RotateCcw; zh: string; en: string }) {
  return (
    <Link
      href={href}
      className="flex flex-1 items-center justify-center gap-1.5 border border-border-strong bg-surface px-3 py-2 text-sm text-fg transition hover:border-accent hover:text-accent-strong"
    >
      <Icon className="size-4 text-accent" aria-hidden />
      <span className="font-display font-bold">{zh}</span>
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
