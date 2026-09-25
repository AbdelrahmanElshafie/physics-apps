'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronRight, Circle, Clock, Lock, Star } from 'lucide-react'

import type { TopicStatus } from '@core/services'
import { cn } from '@/lib/utils'

import { ProgressRing } from './ProgressRing'

/**
 * Syllabus navigator.
 *
 * Serialised plain data rather than domain objects, because this is a client component and Maps
 * do not survive the server boundary. The server does the graph work; this renders the result.
 */

export interface NavTopic {
  id: string
  localId: string
  title: string
  kind: string
  status: TopicStatus
  mastery: number
  critical: boolean
  blockedBy: string[]
  awaitingReviewCount: number
  hasLesson: boolean
}

export interface NavModule {
  id: string
  title: string
  group?: string
  topics: NavTopic[]
}

export interface NavPhase {
  id: string
  title: string
  modules: NavModule[]
}

export function Navigator({
  phases,
  syllabusId,
  syllabusTitle,
  activeTopicId,
  stats,
}: {
  phases: NavPhase[]
  syllabusId: string
  syllabusTitle: string
  activeTopicId: string
  stats: { complete: number; total: number; overallMastery: number; awaitingReview: number }
}) {
  // Open the phase and module containing the current topic; collapse the rest. With 219 topics,
  // showing everything expanded would bury the one thing you are working on.
  const activeModule = phases
    .flatMap((p) => p.modules)
    .find((m) => m.topics.some((t) => t.id === activeTopicId))
  const activePhase = phases.find((p) => p.modules.some((m) => m.id === activeModule?.id))

  const [openPhases, setOpenPhases] = useState<Set<string>>(
    new Set(activePhase ? [activePhase.id] : [phases[0]?.id ?? '']),
  )
  const [openModules, setOpenModules] = useState<Set<string>>(
    new Set(activeModule ? [activeModule.id] : []),
  )

  const toggle = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    apply(next)
  }

  return (
    <nav
      aria-label="Syllabus"
      className="flex h-full min-h-0 flex-col border-r border-border bg-surface"
    >
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">{syllabusTitle}</h2>
        <div className="mt-2 flex items-center gap-2.5">
          <ProgressRing value={stats.overallMastery} size={26} />
          <div className="min-w-0 text-xs text-fg-subtle">
            <p>
              <span className="font-medium text-fg-muted">{stats.complete}</span> of {stats.total}{' '}
              complete
            </p>
            {stats.awaitingReview > 0 && (
              <p className="text-pending">{stats.awaitingReview} awaiting review</p>
            )}
          </div>
        </div>
      </header>

      <div className="pane-scroll min-h-0 flex-1 overflow-y-auto py-2">
        {phases.map((phase) => {
          const phaseOpen = openPhases.has(phase.id)
          return (
            <section key={phase.id}>
              <button
                type="button"
                onClick={() => toggle(openPhases, phase.id, setOpenPhases)}
                aria-expanded={phaseOpen}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-fg-subtle transition-colors hover:text-fg"
              >
                <ChevronRight
                  className={cn('size-3.5 transition-transform', phaseOpen && 'rotate-90')}
                  aria-hidden
                />
                <span className="truncate">{phase.title}</span>
              </button>

              {phaseOpen &&
                phase.modules.map((mod, index) => {
                  const moduleOpen = openModules.has(mod.id)
                  const showGroup = mod.group && mod.group !== phase.modules[index - 1]?.group
                  const done = mod.topics.filter((t) => t.status === 'complete').length

                  return (
                    <div key={mod.id}>
                      {showGroup && (
                        <p className="px-4 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-wider text-fg-subtle/70">
                          {mod.group}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => toggle(openModules, mod.id, setOpenModules)}
                        aria-expanded={moduleOpen}
                        className="flex w-full items-center gap-1.5 py-1.5 pl-5 pr-3 text-left text-xs transition-colors hover:bg-surface-raised"
                      >
                        <ChevronRight
                          className={cn(
                            'size-3 shrink-0 text-fg-subtle transition-transform',
                            moduleOpen && 'rotate-90',
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate font-medium text-fg-muted">
                          {mod.title}
                        </span>
                        <span className="shrink-0 font-mono text-[0.65rem] text-fg-subtle">
                          {done}/{mod.topics.length}
                        </span>
                      </button>

                      {moduleOpen && (
                        <ul>
                          {mod.topics.map((topic) => (
                            <TopicRow
                              key={topic.id}
                              topic={topic}
                              syllabusId={syllabusId}
                              active={topic.id === activeTopicId}
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
            </section>
          )
        })}
      </div>
    </nav>
  )
}

function TopicRow({
  topic,
  syllabusId,
  active,
}: {
  topic: NavTopic
  syllabusId: string
  active: boolean
}) {
  const locked = topic.status === 'locked'

  const row = (
    <span
      className={cn(
        'flex items-center gap-2 py-1.5 pl-10 pr-3 text-xs transition-colors',
        active
          ? 'bg-accent-muted/40 text-fg'
          : locked
            ? 'text-fg-subtle'
            : 'text-fg-muted hover:bg-surface-raised hover:text-fg',
      )}
    >
      <StatusIcon status={topic.status} mastery={topic.mastery} />
      <span className={cn('min-w-0 flex-1 truncate', active && 'font-medium')}>{topic.title}</span>
      {topic.critical && (
        <Star className="size-3 shrink-0 fill-warning text-warning" aria-label="Critical topic" />
      )}
      {topic.awaitingReviewCount > 0 && (
        <span className="shrink-0 rounded-full bg-pending-muted px-1.5 text-[0.65rem] font-medium text-pending">
          {topic.awaitingReviewCount}
        </span>
      )}
    </span>
  )

  if (locked) {
    return (
      <li>
        <span
          className="block cursor-not-allowed opacity-70"
          title={
            topic.blockedBy.length > 0
              ? `Complete first: ${topic.blockedBy.join(', ')}`
              : 'Locked'
          }
        >
          {row}
        </span>
      </li>
    )
  }

  return (
    <li>
      <Link
        href={`/learn/${syllabusId}/${topic.localId}`}
        aria-current={active ? 'page' : undefined}
        className="block"
      >
        {row}
      </Link>
    </li>
  )
}

function StatusIcon({ status, mastery }: { status: TopicStatus; mastery: number }) {
  if (status === 'locked') return <Lock className="size-3 shrink-0 text-fg-subtle" aria-hidden />
  if (status === 'awaiting-review')
    return <Clock className="size-3 shrink-0 text-pending" aria-hidden />
  if (status === 'complete') return <ProgressRing value={1} size={13} status="complete" />
  if (status === 'in-progress') return <ProgressRing value={Math.max(mastery, 0.08)} size={13} />
  return <Circle className="size-3 shrink-0 text-fg-subtle" aria-hidden />
}
