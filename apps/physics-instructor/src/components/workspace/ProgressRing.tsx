import { cn } from '@/lib/utils'

/**
 * Compact mastery indicator.
 *
 * A ring rather than a bar because it sits in a dense tree where horizontal space is scarce, and
 * the status colour has to read at 14px. The value is always paired with a text label elsewhere —
 * colour alone never carries the meaning.
 */
export function ProgressRing({
  value,
  size = 16,
  status = 'default',
  className,
}: {
  value: number
  size?: number
  status?: 'default' | 'complete' | 'review' | 'locked'
  className?: string
}) {
  const clamped = Math.max(0, Math.min(1, value))
  const stroke = size >= 24 ? 2.5 : 2
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  const colour =
    status === 'complete'
      ? 'var(--color-success)'
      : status === 'review'
        ? 'var(--color-pending)'
        : status === 'locked'
          ? 'var(--color-fg-subtle)'
          : 'var(--color-accent)'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0 -rotate-90', className)}
      role="img"
      aria-label={`${Math.round(clamped * 100)}% mastery`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={stroke}
      />
      {clamped > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      )}
    </svg>
  )
}
