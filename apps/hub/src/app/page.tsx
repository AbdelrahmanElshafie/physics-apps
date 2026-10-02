import { ArrowUpRight, Layers, Radio, Sparkles } from 'lucide-react'

import { loadCourses, mostRecent, originOf } from '@/lib/courses'
import { CourseTile } from '@/components/CourseTile'
import { NumberShortcuts } from '@/components/NumberShortcuts'
import { formatRelative } from '@/lib/utils'

/** Probes the dev servers and reads five event logs on every request — never cache it. */
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const courses = await loadCourses()
  const recent = mostRecent(courses)

  const totals = courses.reduce(
    (acc, c) => ({
      topics: acc.topics + c.topicCount,
      written: acc.written + c.writtenCount,
      read: acc.read + c.readCount,
      online: acc.online + (c.online ? 1 : 0),
    }),
    { topics: 0, written: 0, read: 0, online: 0 },
  )

  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-6 py-12 sm:py-16">
      <NumberShortcuts hrefs={courses.map((c) => (c.online ? c.continueHref : originOf(c)))} />

      <header className="relative">
        {/* A wide, very soft wash behind the title, tinted by whichever course was last open. */}
        <div
          className="pointer-events-none absolute -top-32 left-0 h-72 w-full opacity-40 blur-3xl"
          style={{
            background: `radial-gradient(45% 60% at 20% 50%, ${recent?.accentSoft ?? 'transparent'}, transparent)`,
          }}
          aria-hidden
        />

        <p className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-fg-subtle">
          <Layers className="size-3.5" aria-hidden />
          Studio
        </p>
        <h1 className="relative mt-4 max-w-2xl font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Every course,
          <br />
          one screen.
        </h1>
        <p className="relative mt-5 max-w-xl text-base leading-relaxed text-fg-muted">
          Three languages and two physics courses, each its own app on its own port. Open any of
          them from here, or pick up exactly where you left off.
        </p>

        <dl className="relative mt-9 flex flex-wrap gap-x-10 gap-y-4">
          <Stat label="Courses" value={String(courses.length)} />
          <Stat label="Lessons written" value={String(totals.written)} />
          <Stat label="Lessons read" value={String(totals.read)} />
          <Stat
            label="Servers running"
            value={`${totals.online} / ${courses.length}`}
            icon={totals.online > 0 ? <Radio className="size-3.5" aria-hidden /> : undefined}
          />
        </dl>
      </header>

      {/* Resume: the course touched most recently, pulled out so returning takes one click. */}
      {recent && recent.online && (
        <a
          href={recent.continueHref}
          className="group mt-12 flex items-center gap-5 rounded-2xl border border-border bg-surface px-6 py-5 transition hover:border-border-strong"
          style={{ '--accent': recent.accent } as React.CSSProperties}
        >
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold"
            style={{ backgroundColor: recent.accentSoft, color: recent.accent }}
            aria-hidden
          >
            {recent.mark}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <Sparkles className="size-3.5" aria-hidden />
              Pick up where you left off
              {recent.lastActivityAt && (
                <span className="font-normal normal-case tracking-normal">
                  · {formatRelative(recent.lastActivityAt)}
                </span>
              )}
            </span>
            <span className="mt-1 block truncate font-display text-lg font-semibold text-fg">
              {recent.continueTitle}
            </span>
            <span className="block truncate text-sm text-fg-muted">{recent.title}</span>
          </span>
          <ArrowUpRight
            className="size-5 shrink-0 text-fg-subtle transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg"
            aria-hidden
          />
        </a>
      )}

      <section className="mt-10">
        <h2 className="sr-only">All courses</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <CourseTile key={course.dir} course={course} index={index} />
          ))}
        </div>
      </section>

      <footer className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-fg-subtle">
        <p>
          Press <kbd className="rounded border border-border px-1.5 py-0.5 font-mono">1</kbd>–
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono">
            {courses.length}
          </kbd>{' '}
          to open a course. A stopped course shows the command that starts it.
        </p>
        <p className="font-mono">pnpm dev:all · ports {courses.map((c) => c.port).sort().join(' · ')}</p>
      </footer>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-fg-subtle">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-fg">{value}</dd>
    </div>
  )
}
