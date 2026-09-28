import Link from 'next/link'
import { CircuitBoard, Home, NotebookPen } from 'lucide-react'

export function Header() {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-5 py-3">
      <Link href="/" className="flex items-center gap-2 text-base font-bold text-accent-strong">
        <Home className="size-5" aria-hidden />
        الفيزياء بالعربي
      </Link>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <Link
        href="/sandbox"
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-accent-muted/50 hover:text-accent-strong"
      >
        <CircuitBoard className="size-4" aria-hidden />
        صمّم دائرتك
      </Link>
      <Link
        href="/scratch"
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-accent-muted/50 hover:text-accent-strong"
      >
        <NotebookPen className="size-4" aria-hidden />
        مسودتك
      </Link>
    </header>
  )
}
