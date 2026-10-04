import Link from 'next/link'
import { Check } from 'lucide-react'

import type { ProgressState, Syllabus } from '@core/domain'
import { hanziNumeral, splitTitle } from '@/lib/titles'
import { cn } from '@/lib/utils'

/**
 * The course tree: volumes > modules > topics, current topic highlighted, viewed topics ticked.
 * The active topic is a filled gold pill; a viewed topic's dot is ink-filled rather than a second
 * hue, matching the home page's pill states so the two views read as one system.
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
        <h2 className="font-display text-lg font-bold leading-tight text-fg">{syllabus.title}</h2>
        {syllabus.subtitle && <p className="mt-1 text-xs leading-snug text-fg-subtle">{syllabus.subtitle}</p>}
      </div>

      {syllabus.phases.map((phase, phaseIndex) => {
        const { number, name } = splitTitle(phase.title)
        const volume = hanziNumeral(number ? Number(number) : phaseIndex + 1)
        return (
          <div key={phase.id} className="mb-6">
            <p className="mb-2 flex items-baseline gap-2 px-1">
              <span className="rounded-md bg-accent-muted px-2 py-0.5 font-display text-[0.7rem] font-bold text-accent-strong">
                卷{volume}
              </span>
              <span className="font-display text-sm font-bold text-fg">{name}</span>
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
                                    ? 'border-ink bg-ink text-ink-fg'
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
