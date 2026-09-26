import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'

import type { ProgressState, Syllabus } from '@core/domain'
import { cn } from '@/lib/utils'

/**
 * The chapter tree: phases > modules > topics, current topic highlighted, viewed topics ticked.
 *
 * Deliberately no prerequisite locking yet — every topic is a link. physics-instructor gates on
 * `requires` (a real DAG), and this app's syllabus already carries the same edges (same schema,
 * `@physics/core`), so adding the lock is wiring, not redesign, once there is enough content that
 * skipping ahead is actually a problem worth preventing.
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
    <nav className="pane-scroll h-full overflow-y-auto border-l border-border bg-surface-sunken/40 p-3">
      <div className="mb-3 px-1">
        <h2 className="text-sm font-semibold text-fg">{syllabus.title}</h2>
        {syllabus.subtitle && <p className="mt-0.5 text-xs text-fg-subtle">{syllabus.subtitle}</p>}
      </div>

      {syllabus.phases.map((phase) => (
        <div key={phase.id} className="mb-4">
          <p className="mb-1.5 px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-fg-subtle">
            {phase.title}
          </p>
          {phase.moduleIds.map((moduleId) => {
            const mod = syllabus.modules.get(moduleId)
            if (!mod) return null
            return (
              <div key={moduleId} className="mb-2">
                <p className="px-1 py-1 text-xs font-medium text-fg-muted">{mod.title}</p>
                <ul className="space-y-0.5">
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
                            'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                            active
                              ? 'bg-accent-muted/40 text-fg'
                              : 'text-fg-muted hover:bg-surface hover:text-fg',
                          )}
                        >
                          {viewed ? (
                            <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden />
                          ) : (
                            <Circle className="size-3.5 shrink-0 text-fg-subtle/50" aria-hidden />
                          )}
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
      ))}
    </nav>
  )
}

function splitId(topicId: string): { syllabus: string; local: string } {
  const at = topicId.indexOf(':')
  return { syllabus: topicId.slice(0, at), local: topicId.slice(at + 1) }
}
