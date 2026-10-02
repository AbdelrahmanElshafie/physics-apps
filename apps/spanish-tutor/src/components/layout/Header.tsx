import Link from 'next/link'
import { NotebookPen, RotateCcw } from 'lucide-react'

/**
 * The Spanish chrome: a round terracotta ñ as the mark, the app name in the display serif, the
 * two destinations labelled in Spanish first, and an azulejo strip along the bottom edge — the
 * one place the tile pattern appears on every page.
 */
export function Header() {
  return (
    <header className="shrink-0 bg-surface">
      <div className="flex items-center gap-4 px-5 py-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex size-8 items-center justify-center rounded-full bg-accent font-display text-lg font-bold leading-none text-accent-fg shadow-panel"
            aria-hidden
          >
            ñ
          </span>
          <span className="font-display text-lg font-semibold text-fg">
            Español <span className="font-normal text-fg-subtle">·</span> Spanish
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1" aria-label="Sections">
          <HeaderLink href="/review" es="Repaso" en="Review" icon={RotateCcw} />
          <HeaderLink href="/practice" es="Práctica" en="Practice" icon={NotebookPen} />
        </nav>
      </div>
      <div className="azulejo h-1.5 w-full opacity-80" aria-hidden />
    </header>
  )
}

function HeaderLink({
  href,
  es,
  en,
  icon: Icon,
}: {
  href: string
  es: string
  en: string
  icon: typeof RotateCcw
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold text-fg-muted transition-colors hover:bg-accent-muted hover:text-accent-strong"
    >
      <Icon className="size-4" aria-hidden />
      {es}
      <span className="font-normal text-fg-subtle">· {en}</span>
    </Link>
  )
}
