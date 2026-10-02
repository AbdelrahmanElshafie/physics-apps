import Link from 'next/link'
import { Check } from 'lucide-react'

import type { ProgressState, Syllabus } from '@core/domain'
import { posterNumeral, splitTitle } from '@/lib/titles'
import { cn } from '@/lib/utils'

/**
 * The course tree: phases > modules > topics, current topic highlighted, viewed topics ticked.
 * Phases are black bars with a two-digit numeral in condensed capitals, the active topic carries
 * a thick red bar down its left edge, and a read topic gets a filled black square — the same
 * markers the home-page poster uses.
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
    <nav className="pane-scroll h-full overflow-y-auto border-r-2 border-ink bg-surface p-4">
      <div className="mb-5 px-1">
        <h2 className="poster text-lg text-fg">{syllabus.title}</h2>
        {syllabus.subtitle && <p className="mt-1 text-xs leading-snug text-fg-subtle">{syllabus.subtitle}</p>}
      </div>

      {syllabus.phases.map((phase, index) => {
        const { number, name } = splitTitle(phase.title)
        return (
          <div key={phase.id} className="mb-5">
            <p className="poster mb-2 flex items-center gap-2 bg-ink px-2.5 py-1.5 text-xs tracking-[0.12em] text-ink-fg">
              <span className="text-accent">{posterNumeral(number ? Number(number) : index + 1)}</span>
              <span className="truncate">{name}</span>
            </p>
            {phase.moduleIds.map((moduleId) => {
              const mod = syllabus.modules.get(moduleId)
              if (!mod) return null
              return (
                <div key={moduleId} className="mb-3">
                  <p className="poster px-2 py-1 text-[0.65rem] tracking-[0.15em] text-fg-subtle">
                    {splitTitle(mod.title).name}
                  </p>
                  <ul>
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
                              'flex items-center gap-2.5 border-l-4 py-1.5 pl-2 pr-2 text-sm transition-colors',
                              active
                                ? 'border-accent bg-accent-muted font-bold text-fg'
                                : 'border-transparent text-fg-muted hover:bg-surface-sunken hover:text-fg',
                            )}
                          >
                            <span
                              className={cn(
                                'flex size-3 shrink-0 items-center justify-center border-2',
                                viewed ? 'border-ink bg-ink text-ink-fg' : active ? 'border-accent' : 'border-border-strong/60',
                              )}
                              aria-hidden
                            >
                              {viewed && <Check className="size-2" strokeWidth={4} />}
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
