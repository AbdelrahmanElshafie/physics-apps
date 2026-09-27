import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge class names, letting later Tailwind utilities win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000)

  if (!Number.isFinite(seconds)) return ''
  if (seconds < 45) return 'دلوقتي'
  if (seconds < 90) return 'من دقيقة'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `من ${minutes} دقيقة`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `من ${hours} ساعة`

  const days = Math.round(hours / 24)
  if (days < 30) return `من ${days} يوم`

  return then.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })
}
