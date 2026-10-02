/**
 * Syllabus phase and module titles are authored as "Phase 1 — Foundations" and
 * "Module 2.1 — Numbers and Time". The chrome shows the number and the name as separate pieces
 * (a numbered node on the home page, a small label in the sidebar), so split them here once.
 * A title that doesn't follow the pattern comes back whole, with no number.
 */
export function splitTitle(title: string): { number: string | null; name: string } {
  const match = /^(?:Phase|Module)\s+([\d.]+)\s+—\s+(.+)$/.exec(title)
  if (!match) return { number: null, name: title }
  return { number: match[1]!, name: match[2]! }
}
