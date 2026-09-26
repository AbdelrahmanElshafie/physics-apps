# Physics بالعربي

An Arabic (Egyptian-friendly) physics tutoring app for the 3rd-secondary syllabus, starting with
Chapter 1: DC circuits. Sibling app to `physics-instructor` in this same pnpm workspace — separate
deployment, separate content, sharing what is genuinely subject-agnostic via `packages/`.

## What makes this app different from physics-instructor

- **Arabic only.** No locale toggle, no fallback chain — `dir="rtl"` and Arabic strings from the
  root layout down. If a second language is ever needed, that is a real feature to design, not a
  flag to flip.
- **No tutor bridge yet.** Exercises grade themselves (`@physics/checker`) or sit `awaitingReview`
  in the event log for a human to read later — there is no Claude Code file-bridge wired up. Adding
  one later is additive: implement `TutorTransport` from `@physics/core/ports`, wire it into
  `container.ts`, nothing above that changes.
- **A real circuit simulator**, not diagrams. `@physics/circuit-sim` solves arbitrary DC resistive
  networks by modified nodal analysis; `CircuitCanvas` is a breadboard-style dot grid where a
  student clicks two points to place a wire/resistor/battery/switch/ammeter/voltmeter, and the
  circuit re-solves on every change. The same component renders a fixed, read-only worked example
  inside a lesson (`<Circuit components={...} readOnly />` via the MDX registry) or a free sandbox
  at `/sandbox`.

## Commands

```bash
pnpm dev                  # localhost:3200
pnpm validate:content     # schema + prerequisite-graph check
pnpm test
pnpm lint && pnpm typecheck
```

## What comes from packages/

`@physics/core` — syllabus/graph/exercise/progress/ports. `@physics/checker` — the rule-based
`AnswerChecker`. `@physics/circuit-sim` — the DC solver. This app's own `src/core/domain` only adds
`electricity.ts` (the physics: `I = Q/t`, Ohm's law, series/parallel, EMF and internal resistance,
Kirchhoff bookkeeping as needed) and re-exports the shared domain alongside it, so everything reads
from one place: `@core/domain`.

**A number a lesson prints is a number a test checks.** Every worked value in a lesson or an
exercise answer is computed from a function in `electricity.ts`, and a test in `tests/` asserts the
lesson/exercise text matches what that function actually returns — see `tests/electricity.test.ts`.
The first lesson's worked example (I = 20 A, t = 2 s → N = 2.5×10²⁰ electrons) is the book's own
number, chosen because it is independently checkable, not invented for the app.

## Content

Same shape as physics-instructor, minus locale suffixes:

```
content/syllabi/<id>/
  syllabus.yaml            phases > modules > topics, with a prerequisite DAG
  lessons/<topicId>.mdx
  exercises/<topicId>.yaml
```

Adding a syllabus (a future chapter) is adding a folder.

### Gotchas found writing the first lesson

**Import `katex/dist/katex.min.css` in the root layout.** Without it, KaTeX renders both its HTML
and MathML output visibly side by side — every equation appears to print itself twice. The
stylesheet is what hides the MathML copy (kept in the DOM for screen readers, not for sighted
rendering).

**Never put Arabic text inside a LaTeX `\text{...}` command.** KaTeX's fonts have no Arabic glyphs;
an Arabic word inside `\text{}` renders with a console warning and falls back to an unstyled system
font mid-equation. Say the unit or the noun in the surrounding Arabic prose (or in a `<Step why="…">`)
and keep everything inside `\text{}`, and every other LaTeX command, to symbols, digits and
Latin/English words. `tests/latex-arabic-guard.test.ts` scans every lesson and exercise file for
this and fails the build if it regresses.

**MDX rule for LaTeX is the same as physics-instructor's:** `latex={String.raw\`...\`}` for anything
with chrome (`<Eq>`, `<Step>`), `$...$` for prose math — never LaTeX as an element's plain children,
which MDX parses as markdown and mangles.

**`<Circuit>` components take grid coordinates, not pixels**: `{ col, row }` integers on the
breadboard's dot grid. Two components sharing a point are the same electrical node — that is the
entire connectivity model, both for the solver and for a student's mental model of it. Set `ground`
explicitly on an authored diagram rather than relying on the first component's first terminal.

## Architecture

Same ports-and-adapters shape as physics-instructor, enforced the same way (`no-restricted-imports`
on `src/core/**`): `src/core/domain` and `src/core/ports` stay pure; `src/adapters/*` are the only
things touching the filesystem; `src/container.ts` is the only place naming a concrete adapter.
