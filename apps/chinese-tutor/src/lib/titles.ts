/**
 * Syllabus phase and module titles are authored as "Phase 1 — Foundations" and
 * "Module 2.1 — Numbers and Time". The chrome shows the number and the name as separate pieces
 * (卷一 on the home page, a small label in the sidebar), so split them here once. A title that
 * doesn't follow the pattern comes back whole, with no number.
 */
export function splitTitle(title: string): { number: string | null; name: string } {
  const match = /^(?:Phase|Module)\s+([\d.]+)\s+—\s+(.+)$/.exec(title)
  if (!match) return { number: null, name: title }
  return { number: match[1]!, name: match[2]! }
}

const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const

/** 1 → 一, 10 → 十, 12 → 十二, 21 → 二十一. Enough for a table of contents. */
export function hanziNumeral(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n)
  if (n < 10) return DIGITS[n]!
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return `${tens === 1 ? '' : DIGITS[tens]}十${ones === 0 ? '' : DIGITS[ones]}`
}
