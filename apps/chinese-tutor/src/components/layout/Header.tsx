import Link from 'next/link'
import { NotebookPen, RotateCcw } from 'lucide-react'

/**
 * The Chinese chrome: a running head like a printed book's — the seal 中 as the mark, the app
 * name in the Song serif, the two destinations labelled in Chinese first, and the double rule
 * underneath that a page carries under its header.
 */
export function Header() {
  return (
    <header className="book-rule shrink-0 bg-surface">
      <div className="flex items-center gap-4 px-5 py-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="seal size-8 text-lg leading-none" aria-hidden>
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
      className="flex items-center gap-1.5 border-b-2 border-transparent px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent-strong"
    >
      <Icon className="size-4" aria-hidden />
      <span className="font-display font-bold">{zh}</span>
      <span className="text-fg-subtle">{en}</span>
    </Link>
  )
}
