import Link from 'next/link'
import { NotebookPen, RotateCcw } from 'lucide-react'

/**
 * The Russian chrome: a skewed cobalt block as the mark, the app name in the condensed display
 * face, the two destinations labelled in Russian first, and a cobalt hairline along the bottom
 * edge — the only places the accent appears here.
 */
export function Header() {
  return (
    <header className="shrink-0 border-b-2 border-accent bg-surface">
      <div className="flex items-center gap-4 px-5 py-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="block h-7 w-5 shrink-0 skew-x-[-16deg] rounded-xs bg-accent" aria-hidden />
          <span className="poster text-xl text-fg">
            Русский <span className="font-normal text-fg-subtle">· Russian</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1" aria-label="Sections">
          <HeaderLink href="/review" ru="Повторение" en="Review" icon={RotateCcw} />
          <HeaderLink href="/practice" ru="Практика" en="Practice" icon={NotebookPen} />
        </nav>
      </div>
    </header>
  )
}

function HeaderLink({
  href,
  ru,
  en,
  icon: Icon,
}: {
  href: string
  ru: string
  en: string
  icon: typeof RotateCcw
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:bg-accent-muted hover:text-accent-strong"
    >
      <Icon className="size-4" aria-hidden />
      <span className="poster text-sm">{ru}</span>
      <span className="text-fg-subtle">{en}</span>
    </Link>
  )
}
