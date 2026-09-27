# Physics بالعربي

An Arabic (Egyptian-friendly) physics tutoring app for the 3rd-secondary syllabus, starting with
Chapter 1: DC circuits. Sibling app to `physics-instructor` in this same pnpm workspace — separate
deployment, separate content, sharing what is genuinely subject-agnostic via `packages/`.

## What makes this app different from physics-instructor

- **Arabic only.** No locale toggle, no fallback chain — `dir="rtl"` and Arabic strings from the
  root layout down. If a second language is ever needed, that is a real feature to design, not a
  flag to flip.
- **No SymPy sidecar.** The tutor bridge and scratchpad (below) run on the same shared packages
  physics-instructor uses, but this app's `checker` is `RulesAnswerChecker` alone — a symbolic
  derivation step the rules checker cannot parse comes back `unchecked`, honestly, rather than
  guessing. Adding a CAS later is additive, same as physics-instructor's.
- **A real circuit simulator**, not diagrams. `@physics/circuit-sim` solves arbitrary DC resistive
  networks by modified nodal analysis; `CircuitCanvas` is a breadboard-style dot grid where a
  student clicks two points to place a wire/resistor/battery/switch/ammeter/voltmeter, and the
  circuit re-solves on every change. The same component renders a fixed, read-only worked example
  inside a lesson (`<Circuit components={...} readOnly />` via the MDX registry) or a free sandbox
  at `/sandbox`.

## Watching a student solve, not just grading the final answer

Two mechanisms, both shared with physics-instructor via `@physics/tutor-bridge` and
`@physics/scratchpad` (see each package's README) and rooted under this app's own `data/`:

- **The tutor bridge.** `submitAttempt` escalates to the instructor whenever `needsTutorReview`
  (an exercise with `explain.required`, or `check.type: 'tutor'`) or the checker returns anything
  other than `correct` — never just when the checker fails to parse an answer. `pnpm tutor` lists
  what's waiting, `pnpm tutor <n>` shows the question with its exercise and expected answer,
  `pnpm tutor:reply <n> "…"` answers it and the reply streams into the open page with no refresh
  (`ExerciseTutor.tsx`, backed by `@physics/tutor-bridge/react`'s `useThreadMessages`, inside a
  `TutorStreamProvider` wrapping the lesson page).
- **The scratchpad**, at `/scratch`. A derivation, one LaTeX step per line, checked against the
  step before it (`checkWorking` from `@physics/scratchpad`) — the failure this catches (a sign
  lost in step three, built on faithfully for five more steps) is invisible to an answer-only
  check. "Ask your instructor" sends the whole derivation, inlined, to the same queue.

Both need `MathInput` from `@physics/math-ui` for LaTeX entry — `/api/render` (POST `{latex}` ->
`{html}`, using this app's own `renderMath`/`KATEX_MACROS` from `lib/katex.ts`) backs its LaTeX-mode
live preview, and `predev`/`prebuild` sync MathLive's fonts into `public/mathlive/fonts` the same
way physics-instructor does. Exercise answers themselves stay plain text/numeric — only the
scratchpad needs LaTeX entry, so `ExerciseCard`'s explanation field for `explain.required` is a
plain `<textarea>`, not a math field.

## Commands

```bash
pnpm dev                  # localhost:3200
pnpm validate:content     # schema + prerequisite-graph check
pnpm test
pnpm lint && pnpm typecheck
pnpm tutor                # list student questions waiting on you   <- check this every session
pnpm tutor <n>            # read question n in full, with its exercise and expected answer
pnpm tutor:reply <n> "…"  # answer it; appears in their browser immediately, no refresh
pnpm tutor grade <n> correct|partial|incorrect "feedback"
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
