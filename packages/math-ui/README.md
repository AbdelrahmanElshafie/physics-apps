# @physics/math-ui

Equation *input*, as opposed to `@physics/core`'s read-only rendering concerns — this is for typing
LaTeX, not displaying it.

- `MathField` — imperative MathLive wrapper. The element is constructed by hand (not rendered as
  JSX) because `mathlive` registers a custom element and can only load in the browser, and
  properties cannot be read or written before it is mounted. Exposes `insert`/`focus`/`getValue`
  through a ref, so a palette button inserts into *this* field specifically — a
  `document.querySelector` would find the first math field on a page with twenty exercises.
- `MathInput` — `MathField` plus a raw-LaTeX textarea over the same value (a toggle, not two
  separate answers) and the equation palette. Its LaTeX-mode live preview posts to `/api/render`;
  every consuming app must serve that route with the exact same KaTeX macro table its lessons
  render with, or the preview will drift from the final render.
- `EquationActions` — the copy/"ask about this" buttons on a display equation. Takes an
  `onAskAbout` callback rather than reaching into a store, so each app wires its own way of opening
  a question.
- `palette.ts` — one table serving both editors. MathLive's insert tokens are `#@` (selection, or
  the token before the caret) and `#?` (a placeholder the caret jumps into) — never `#0`, which is
  macro-argument syntax and silently produces an empty slot. `tests/palette.test.ts` pins this down.

`fontsDirectory` and `macros` are optional props on `MathField`/`MathInput` rather than hardcoded,
because font-serving paths and subject-specific notation (bra-ket for quantum mechanics, say)
belong to the consuming app, not to this package.

Not here: KaTeX *rendering* (that is `renderMath`/`M`/`DisplayMath`, which stay per-app since each
app's macro table differs) and anything tutor-bridge-related (`EquationActions`'s callback is how
the two connect, deliberately without either package depending on the other).
