import Link from 'next/link'
import { Check } from 'lucide-react'

import type { ProgressState, Syllabus } from '@core/domain'
import { posterNumeral, splitTitle } from '@/lib/titles'
import { cn } from '@/lib/utils'

/**
 * The course tree: phases > modules > topics, current topic highlighted, viewed topics ticked.
 * Phases carry the same two-digit numeral the home page uses, and the active topic is a filled
 * red pill — the same shape the home page uses for a lesson, so the two views read as one system.
 *
 * No prerequisite locking yet — every topic is a link, even though the syllabus already carries a
 * `requires` DAG (same schema as the physics apps). Worth adding once there is enough content that
 * skipping ahead is actually a problem worth preventing, not before.
 */
export function Sidebar({
  syllabus,
  progress,
  activeTopicId,
}: {
  syllabus: Syllabus
  progress: ProgressState
  activeTopicId: string
}) {
  return (
    <nav className="pane-scroll h-full overflow-y-auto border-r border-border bg-surface-sunken/60 p-4">
      <div className="mb-5 px-1">
        <h2 className="poster text-lg text-fg">{syllabus.title}</h2>
        {syllabus.subtitle && <p className="mt-1 text-xs leading-snug text-fg-subtle">{syllabus.subtitle}</p>}
      </div>

      {syllabus.phases.map((phase, index) => {
        const { number, name } = splitTitle(phase.title)
        const ordinal = posterNumeral(number ? Number(number) : index + 1)
        return (
          <div key={phase.id} className="mb-6">
            <p className="mb-2 flex items-baseline gap-2 px-1">
              <span className="poster rounded-md bg-accent-muted px-2 py-0.5 text-[0.7rem] text-accent-strong">
                {ordinal}
              </span>
              <span className="poster text-sm text-fg">{name}</span>
            </p>
            {phase.moduleIds.map((moduleId) => {
              const mod = syllabus.modules.get(moduleId)
              if (!mod) return null
              return (
                <div key={moduleId} className="mb-3">
                  <p className="px-2 py-1 text-[0.7rem] font-semibold text-fg-subtle">
                    {splitTitle(mod.title).name}
                  </p>
                  <ul className="space-y-1">
                    {mod.topicIds.map((topicId) => {
                      const topic = syllabus.topics.get(topicId)
                      if (!topic) return null
                      const viewed = progress.topics.get(topicId)?.viewed ?? false
                      const active = topicId === activeTopicId
                      const { syllabus: syllabusLocal, local } = splitId(topicId)
                      return (
                        <li key={topicId}>
                          <Link
                            href={`/lesson/${syllabusLocal}/${local}`}
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                              active
                                ? 'bg-accent font-semibold text-accent-fg shadow-panel'
                                : 'text-fg-muted hover:bg-surface hover:text-fg',
                            )}
                          >
                            <span
                              className={cn(
                                'flex size-4 shrink-0 items-center justify-center rounded-full border',
                                active
                                  ? 'border-accent-fg/60'
                                  : viewed
                                    ? 'border-success bg-success text-accent-fg'
                                    : 'border-border-strong',
                              )}
                              aria-hidden
                            >
                              {viewed && <Check className="size-3" strokeWidth={3} />}
                            </span>
                            <span className="truncate">{topic.title}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}

function splitId(topicId: string): { syllabus: string; local: string } {
  const at = topicId.indexOf(':')
  return { syllabus: topicId.slice(0, at), local: topicId.slice(at + 1) }
}
