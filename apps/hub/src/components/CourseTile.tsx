import { AlertTriangle, ArrowUpRight, BookOpen, Play } from 'lucide-react'

import { originOf, startCommand, type Course } from '@/lib/courses'
import { cn, formatRelative } from '@/lib/utils'

/**
 * One course, as a tile.
 *
 * The whole tile is a link to that app's home page; the "Continue" button inside it is a second,
 * deeper link to the specific lesson to resume. Nesting a link inside a link is invalid HTML, so
 * the outer link is a stretched overlay rather than a wrapper — the button then sits above it and
 * keeps its own target.
 */
export function CourseTile({ course, index }: { course: Course; index: number }) {
  const { accent, accentSoft } = course
  const readPercent = course.topicCount > 0 ? (course.readCount / course.topicCount) * 100 : 0
  const writtenPercent = course.topicCount > 0 ? (course.writtenCount / course.topicCount) * 100 : 0

  return (
    <article
      className="tile group flex flex-col rounded-2xl border border-border"
      style={{ '--accent': accent, '--accent-soft': accentSoft } as React.CSSProperties}
    >
      <div className="tile-edge h-[3px] w-full" aria-hidden />

      <div className="flex flex-1 flex-col p-6">
        <header className="flex items-start gap-4">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold"
            style={{ backgroundColor: accentSoft, color: accent }}
            aria-hidden
          >
            {course.mark}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-display text-xl font-semibold text-fg">{course.native}</h2>
              <span className="shrink-0 text-sm text-fg-subtle">{course.label}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-fg-muted">{course.blurb}</p>
          </div>

          {/* The keyboard hint doubles as the tile's ordinal. */}
          <kbd className="hidden shrink-0 rounded-md border border-border px-2 py-1 font-mono text-xs text-fg-subtle sm:block">
            {index + 1}
          </kbd>
        </header>

        {course.error ? (
          <p className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-canvas/50 px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" aria-hidden />
            Couldn&apos;t read this course&apos;s syllabus: {course.error}
          </p>
        ) : (
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <p className="text-fg-muted">
                <span className="font-display text-lg font-semibold text-fg">{course.readCount}</span>
                <span className="text-fg-subtle"> / {course.topicCount} read</span>
              </p>
              <p className="text-xs text-fg-subtle">{course.writtenCount} lessons written</p>
            </div>

            {/* Two bars in one track: how much of the course exists, and how much is read. */}
            <div className="meter relative mt-2 h-1.5 overflow-hidden rounded-full">
              <span
                className="absolute inset-y-0 left-0 rounded-full opacity-30"
                style={{ width: `${writtenPercent}%`, backgroundColor: accent }}
              />
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${readPercent}%`, backgroundColor: accent }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto pt-6">
          {course.online ? (
            <a
              href={course.continueHref}
              className="relative z-10 flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-canvas transition hover:brightness-110"
              style={{ backgroundColor: accent }}
            >
              <Play className="size-4 shrink-0 fill-current" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.7rem] font-semibold uppercase tracking-wider opacity-70">
                  {course.resuming ? 'Continue' : 'Start'}
                </span>
                <span className="block truncate text-sm font-semibold">{course.continueTitle}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 opacity-80" aria-hidden />
            </a>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-subtle">
                Not running — start it with
              </p>
              <code className="mt-1 block truncate font-mono text-xs text-fg-muted">
                {startCommand(course)}
              </code>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-fg-subtle">
            <span className="flex items-center gap-1.5">
              <span className="relative flex size-1.5">
                <span
                  className={cn('size-1.5 rounded-full', course.online && 'live-dot')}
                  style={{ backgroundColor: course.online ? accent : 'var(--color-border-strong)' }}
                />
              </span>
              localhost:{course.port}
            </span>
            {course.lastActivityAt ? (
              <span>{formatRelative(course.lastActivityAt)}</span>
            ) : (
              <span className="flex items-center gap-1">
                <BookOpen className="size-3" aria-hidden />
                not opened yet
              </span>
            )}
          </div>
        </div>
      </div>

      {/* The stretched link: the whole tile opens the app's home page. */}
      <a
        href={originOf(course)}
        className="absolute inset-0 rounded-2xl"
        aria-label={`Open ${course.label} at localhost:${course.port}`}
      >
        <span className="sr-only">Open {course.label}</span>
      </a>
    </article>
  )
}
