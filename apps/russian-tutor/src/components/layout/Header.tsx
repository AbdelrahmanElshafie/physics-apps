import Link from 'next/link'
import { NotebookPen, RotateCcw } from 'lucide-react'

/**
 * The Russian chrome: a black bar with the app name in condensed capitals, a red slanted block
 * as the mark, and the two destinations labelled in Russian first — poster lettering, not a
 * toolbar.
 */
export function Header() {
  return (
    <header className="shrink-0 border-b-4 border-accent bg-ink text-ink-fg">
      <div className="flex items-stretch gap-4 px-5">
        <Link href="/" className="flex items-center gap-3 py-2.5">
          <span className="block h-7 w-5 skew-x-[-16deg] bg-accent" aria-hidden />
          <span className="poster text-xl">
            Русский <span className="font-medium text-ink-fg/55">· Russian</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-stretch" aria-label="Sections">
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
      className="poster flex items-center gap-2 border-b-4 border-transparent px-4 text-sm font-medium tracking-wider text-ink-fg/85 transition-colors hover:bg-accent hover:text-accent-fg"
    >
      <Icon className="size-4" aria-hidden />
      {ru}
      <span className="font-medium normal-case tracking-normal text-ink-fg/50">{en}</span>
    </Link>
  )
}
