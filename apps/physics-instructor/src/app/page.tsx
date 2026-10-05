import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BookOpen } from 'lucide-react'

import { mostRecentTopic, parseTopicId } from '@core/domain'
import { buildTopicViews, nextTopic, summarise } from '@core/services'
import { container } from '@/container'

/**
 * Entry point: continue where you left off.
 *
 * "Left off" means the lesson literally last open — `mostRecentTopic` — not the next unfinished
 * one `nextTopic` would suggest; the two usually agree, but not once work is revisited out of
 * order. `nextTopic` is still the fallback on a brand-new syllabus, where nothing has a
 * `lastActivityAt` yet to resume to.
 *
 * With one syllabus this is a redirect straight into that topic — landing on a menu when there is
 * only one sensible destination is friction, not choice. More than one, and it becomes a picker.
 */
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { content, progress } = container()
  const syllabi = await content.listSyllabi()

  if (syllabi.length === 0) return <NoContent />

  if (syllabi.length === 1) {
    const syllabus = syllabi[0]!
    const [state, counts] = await Promise.all([progress.state(), content.exerciseCounts()])
    const views = buildTopicViews(syllabus, state, counts)
    const resumeId = mostRecentTopic(state)

    const target =
      (resumeId && syllabus.topics.get(resumeId)) ??
      nextTopic(views, syllabus.order)?.topic ??
      // Everything complete, or nothing ever touched and nextTopic found nothing ready: fall
      // back to the first topic rather than dead-ending.
      syllabus.topics.get(syllabus.order[0]!)
    if (target) {
      const { syllabus: sid, local } = parseTopicId(target.id)
      redirect(`/learn/${sid}/${local}`)
    }
  }

  const summaries = await Promise.all(
    syllabi.map(async (syllabus) => {
      const [state, counts] = await Promise.all([progress.state(), content.exerciseCounts()])
      const views = buildTopicViews(syllabus, state, counts)
      const resumeId = mostRecentTopic(state)
      const next = (resumeId && views.get(resumeId)) ?? nextTopic(views, syllabus.order)
      return { syllabus, stats: summarise(views), next }
    }),
  )

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Choose a syllabus</h1>
      <ul className="mt-8 space-y-3">
        {summaries.map(({ syllabus, stats, next }) => {
          const target = next?.topic ?? syllabus.topics.get(syllabus.order[0]!)
          if (!target) return null
          const { syllabus: sid, local } = parseTopicId(target.id)

          return (
            <li key={String(syllabus.id)}>
              <Link
                href={`/learn/${sid}/${local}`}
                className="flex items-center gap-4 rounded-panel border border-border bg-surface px-5 py-4 transition-colors hover:border-accent"
              >
                <BookOpen className="size-5 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg">{syllabus.title}</p>
                  <p className="truncate text-sm text-fg-muted">
                    {stats.complete} of {stats.total} complete · continue: {target.title}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

function NoContent() {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-xl font-semibold text-fg">No syllabus found</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        Add a folder under{' '}
        <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-xs">
          content/syllabi/
        </code>{' '}
        containing a <code className="font-mono text-xs">syllabus.yaml</code>. It is picked up
        automatically — no code change needed.
      </p>
    </main>
  )
}
