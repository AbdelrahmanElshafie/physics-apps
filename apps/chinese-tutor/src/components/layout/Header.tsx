import Link from 'next/link'
import { LayoutGrid, NotebookPen, RotateCcw } from 'lucide-react'

import { HUB_URL } from '@/lib/hub'

/**
 * The Chinese chrome: a 中 seal as the mark, the app name in the Song serif, the two destinations
 * labelled in Chinese first, and a hairline rule over a gold thread underneath. The grid icon at
 * the far left is a plain `<a>`, not a Next `Link` — it crosses to the hub's own port, so
 * client-side routing can't help.
 */
export function Header() {
  return (
    <header className="book-rule shrink-0 bg-surface">
      <div className="flex items-center gap-4 px-5 py-2.5">
        <a
          href={HUB_URL}
          title="All courses"
          aria-label="Back to all courses"
          className="flex items-center justify-center rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-accent-muted hover:text-accent-strong"
        >
          <LayoutGrid className="size-4" aria-hidden />
        </a>
        <span className="h-5 w-px bg-border" aria-hidden />

        <Link href="/" className="flex items-center gap-2.5">
          <span className="seal size-8 rounded-lg text-lg leading-none" aria-hidden>
            中
          </span>
          <span className="font-display text-lg font-bold text-fg">
            中文 <span className="font-normal text-fg-subtle">·</span> Mandarin
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1" aria-label="Sections">
          <HeaderLink href="/review" zh="复习" en="Review" icon={RotateCcw} />
          <HeaderLink href="/practice" zh="练习" en="Practice" icon={NotebookPen} />
        </nav>
      </div>
    </header>
  )
}

function HeaderLink({
  href,
  zh,
  en,
  icon: Icon,
}: {
  href: string
  zh: string
  en: string
  icon: typeof RotateCcw
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-accent-muted hover:text-accent-strong"
    >
      <Icon className="size-4" aria-hidden />
      <span className="font-display font-bold">{zh}</span>
      <span className="text-fg-subtle">{en}</span>
    </Link>
  )
}
