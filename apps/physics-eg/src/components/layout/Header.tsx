import Link from 'next/link'
import { CircuitBoard, Home, NotebookPen } from 'lucide-react'

export function Header() {
  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Home className="size-4" aria-hidden />
        الفيزياء بالعربي
      </Link>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <Link
        href="/sandbox"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-fg-muted transition hover:bg-surface-raised hover:text-fg"
      >
        <CircuitBoard className="size-3.5" aria-hidden />
        صمّم دائرتك
      </Link>
      <Link
        href="/scratch"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-fg-muted transition hover:bg-surface-raised hover:text-fg"
      >
        <NotebookPen className="size-3.5" aria-hidden />
        مسودتك
      </Link>
    </header>
  )
}
