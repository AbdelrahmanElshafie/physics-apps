/**
 * Bra-ket notation for the MathLive editor (`MathField`'s `macros` prop), so a student can type
 * `\ket`/`\bra`/`\braket` without a palette trip — used constantly in this syllabus.
 *
 * Distinct from `KATEX_MACROS` in `lib/katex.ts`: MathLive's macro dictionary keys are bare names
 * (`ket`), while KaTeX's need the leading backslash in the key (`'\\ket'`) — same notation, two
 * different conventions, so this is its own small table rather than derived from that one.
 */
export const MATHFIELD_MACROS: Record<string, string> = {
  ket: '\\left\\lvert #1 \\right\\rangle',
  bra: '\\left\\langle #1 \\right\\rvert',
  braket: '\\left\\langle #1 \\middle\\vert #2 \\right\\rangle',
}
