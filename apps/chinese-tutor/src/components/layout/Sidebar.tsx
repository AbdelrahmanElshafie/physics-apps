import Link from 'next/link'

import type { ProgressState, Syllabus } from '@core/domain'
import { hanziNumeral, splitTitle } from '@/lib/titles'
import { cn } from '@/lib/utils'

/**
 * The course tree: phases > modules > topics, current topic highlighted, viewed topics marked.
 * Phases are 卷一, 卷二… in the Song serif, the active topic carries a vermilion bar down its
 * left edge like a reader's mark in a margin, and a read topic gets a jade dot — the same cues
 * the home page's table of contents uses.
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
    <nav className="pane-scroll paper h-full overflow-y-auto border-r border-border-strong p-4">
      <div className="mb-5 border-b border-fg px-1 pb-3">
        <h2 className="font-display text-base font-bold leading-tight text-fg">{syllabus.title}</h2>
        {syllabus.subtitle && <p className="mt-1 text-xs leading-snug text-fg-subtle">{syllabus.subtitle}</p>}
      </div>

      {syllabus.phases.map((phase, phaseIndex) => {
        const { number, name } = splitTitle(phase.title)
        const volume = hanziNumeral(number ? Number(number) : phaseIndex + 1)
        return (
          <div key={phase.id} className="mb-5">
            <p className="mb-2 flex items-baseline gap-2 px-1">
              <span className="font-display text-sm font-bold text-accent">卷{volume}</span>
              <span className="font-display text-sm font-bold text-fg">{name}</span>
            </p>
            {phase.moduleIds.map((moduleId) => {
              const mod = syllabus.modules.get(moduleId)
              if (!mod) return null
              return (
                <div key={moduleId} className="mb-3">
                  <p className="px-2 py-1 text-[0.7rem] tracking-wide text-fg-subtle">{splitTitle(mod.title).name}</p>
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
                              'flex items-center gap-2.5 border-l-[3px] py-1.5 pl-2.5 pr-2 text-sm transition-colors',
                              active
                                ? 'border-accent bg-accent-muted/60 font-display font-bold text-accent-strong'
                                : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg',
                            )}
                          >
                            <span
                              className={cn(
                                'size-1.5 shrink-0 rounded-full',
                                viewed ? 'bg-jade' : active ? 'bg-accent' : 'bg-border-strong',
                              )}
                              aria-hidden
                            />
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
