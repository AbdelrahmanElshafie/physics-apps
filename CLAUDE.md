# Physics Instructor

An interactive nuclear-physics tutoring app. I am the instructor; the app is the classroom.

## What this is

A local Next.js app that renders lessons with typeset maths, lets the student answer in LaTeX,
tracks mastery as real data, and routes questions to me in this terminal. It replaces a workflow
that previously lived in two markdown files (`Learning_Path_Checklist.md`,
`Nuclear_Physics_Handbook.md` — both still present, untouched, as the source of the migration).

## Commands

```bash
pnpm dev                  # localhost:3100  (3000 is taken by another project on this machine)
pnpm tutor                # list student questions waiting on me   <- check this every session
pnpm tutor <n>            # read question n in full, with its exercise and expected answer
pnpm tutor:reply <n> "…"  # answer it; appears in their browser immediately, no refresh
pnpm tutor grade <n> correct|partial|incorrect "feedback"
pnpm validate:content     # schema + prerequisite-graph check over all content
pnpm export:handbook      # regenerate portable markdown from the content
pnpm test                 # Vitest over core domain (pure, no mocks)
pnpm lint && pnpm typecheck
```

## Architecture: ports and adapters

`src/core/` is **pure TypeScript** — no Next, no React, no Node built-ins, no adapters, no UI.
Everything environmental sits behind an interface in `src/core/ports/`.

```
src/core/domain      entities, Zod schemas, the progress reducer, the prerequisite graph
src/core/ports       ContentRepository · ProgressRepository · TutorTransport · AnswerChecker
src/core/services    learning-path · submit-attempt · ask-tutor
src/adapters/…       one implementation each: fs-mdx, fs-events, claude-code, rules
src/container.ts     composition root — THE ONLY place that names a concrete adapter
```

This is enforced, not aspirational: an ESLint rule **and** `tests/architecture.test.ts` fail the
build if `core/` imports anything environmental, or if a route imports an adapter directly. If a
dependency wants to point the wrong way, invert it behind a port — do not relax the rule.

### The three seams that matter

| Port | Today | Planned |
|---|---|---|
| `TutorTransport` | `claude-code` — file bridge, answered from this terminal | `anthropic` — API tutor (M3) |
| `ContentRepository` / `ProgressRepository` | filesystem | SQLite (M5) |
| `AnswerChecker` | rule-based | SymPy sidecar (M4) |

Switching the tutor to the API is a new adapter plus a branch in `container.ts`. **The UI must
branch on `transport.capabilities`, never on `transport.id`** — that is what lets the same
components show a queued badge now and a token stream later.

## How progress works

`data/events.jsonl` is an **append-only log**; all state is `reduceEvents(events)`. Never edit or
reorder past lines — correct by appending. That is what makes history, streaks and analytics
free to add later with no migration, and it means I can grade work by appending one line.

## Authoring content

```
content/syllabi/<id>/
  syllabus.yaml            phases > modules > topics, with a prerequisite DAG
  lessons/<topicId>.mdx
  exercises/<topicId>.yaml
  glossary.yaml
```

**Adding a syllabus is adding a folder.** The registry discovers them; there is no list to update.
Content is read per request, so a file saved here shows up on the next refresh — no rebuild.

### The MDX rule that bites

MDX parses element children as markdown, which **eats LaTeX backslashes**. So:

- Prose maths: `$...$` and `$$...$$` (remark-math handles escaping correctly).
- Equations needing chrome: `<Eq id="..." label="..." latex={String.raw\`...\`} />`. The
  `String.raw` is a real JS expression, so the string survives byte for byte — and the copy and
  "ask about this" buttons get the exact source.

Same applies to `<Step latex={String.raw\`...\`} why="..." />`.

Available components: `Eq`, `Callout` (why/note/warning/forward), `Compare`, `Axioms`,
`Derivation`+`Step`, `Definition`, `Symbol` (glossary tooltip), `VectorPlot`,
`InnerProductPlot`, `EigenPlot`. Registered in
`src/components/mdx/index.tsx` — add widgets there.

**Never write backslash-heavy files with a bash heredoc.** It collapses `\\` to `\` and silently
corrupts every regex and LaTeX macro. Use the Write tool.

## The scratchpad

`/scratch` is free-form working, separate from exercises: the learner writes a derivation one line
per step, and **each line is checked against the one before it**. That catches the sign lost in
step three that the next five steps faithfully preserve — the failure an answer-only check cannot
see. "Ask for review" sends the whole derivation to my queue with the working inlined, so
`pnpm tutor <n>` shows it without opening the app.

Stored as one JSON file per pad under `data/scratch/` (gitignored — it is personal working, not
content), behind `ScratchpadRepository`. Deliberately *not* in the event log: that log is
append-only history, and a document edited in place would bloat it with every autosave.

## Symbolic checking (SymPy)

`scripts/sympy_sidecar.py` is a long-lived Python worker speaking JSON lines over stdin/stdout.
Long-lived because importing SymPy costs over a second, so spawning per check would make "instant"
a lie. `CompositeAnswerChecker` runs the rule-based checker first and only consults SymPy for what
is left: roots, unevaluated arithmetic, factored-versus-expanded.

Requires `pip install sympy "antlr4-python3-runtime==4.11.*"`. **Without it the app is fine** —
the adapter reports `unverified` and those answers route to me. `SYMBOLIC_CHECKING=off` disables
it; `PYTHON_BIN` overrides the interpreter.

The worker has a prose guard: `parse_latex` will happily read "this is not maths" as a product of
single-letter symbols and then report a confident "not equal". Two or more three-letter words means
prose, and prose is never judged.

## Languages (English / Arabic)

Content is per-locale sibling files: `m1.1-hilbert-spaces.ar.mdx` next to the English base, same
for `.ar.yaml` exercises. **Adding a translation is adding a file.** A missing one falls back to
English and the page says so — never a blank.

Keep exercise `id`, `kind` and `check` identical across locales — `pnpm validate:content` enforces
this and fails the run otherwise. Progress is recorded against the id, so a renamed one would hide
an answer already submitted in the other language, and a differing `check` would mark the same
question correct in one language and wrong in the other.

Quote `hint:` values that sit inside a flow mapping (`{ required: true, hint: "..." }`). An
unquoted `?` or `:` there is ambiguous YAML: the JS parser tolerates it, other parsers do not.

Resolution order: `?lang=` in the URL (the per-page override, and shareable) beats the `pi_locale`
cookie (the global setting, written by the store). Interface strings live in `src/lib/i18n.ts`,
typed off the English keys so an untranslated string is a compile error.

**The rule that matters: maths must never be reordered by the bidi algorithm.** `direction: ltr`
alone is not enough — `unicode-bidi: isolate` is what keeps an equation out of the paragraph's
bidi resolution, so a minus sign cannot migrate to the wrong end inside Arabic prose. That CSS is
in `globals.css` under "Bidirectional text" and covers `.katex`, `math-field`, `code` and
`[data-ltr]`. If you add a surface that renders maths or code, isolate it there too.

Arabic style: plain Egyptian-leaning phrasing, technical terms kept in English in parentheses on
first use (`الضرب الداخلي (inner product)`), Western digits throughout — that is what the papers
and the nuclear data tables use.

## GRASP / MCDHF track

The research goal is producing work like Fatma El-Sayed's JQSRT papers (Zr XXXV 2020, Mo XXXVI
2021): MCDHF in GRASP2018, active-space CSF expansion, RCI with Breit + QED, then E1/M1/E2/M2
transition data with uncertainty taken from the shift between successive active-set layers.

GRASP2018 lives in WSL at `~/GRASP2018` (53 binaries, MPI builds included). Reference material and
a known-good hand-written pipeline are in `G:\Researches\GRASP`.

- `src/core/domain/grasp.ts` — a calculation as data. Every field is an answer one GRASP program
  asks for, named with the program's own prompt wording, taken from the GRASP2018 sources.
- `src/core/services/grasp-script.ts` — spec in, runnable pipeline out. Pure, so it is testable and
  will feed the WSL runner later.
- `src/adapters/grasp/parse/rlevels.ts` — the energy-level table, written against real output.
- `pnpm grasp:script specs/<spec>.yaml -o out/run.sh`

**Never put a comment inside a heredoc.** Its contents are the program's stdin, so an annotated
answer line is fed to GRASP as part of that answer. Annotations go in a comment block above the
heredoc; a test enforces it. This is not hypothetical — it killed a real run.

**rnucleus takes seven answers**, not six: Z, A, revise?, *mass of the neutral atom in amu*, spin,
dipole moment, quadrupole moment. Omitting the mass shifts every later answer up by one and the
program dies on end-of-file far from the cause.

Verification standard for this track: the generated Mo36 script produces `even.c` and `odd.c`
**byte-identical** to the real run, with 346 and 423 CSFs matching `ncftot` in its rlevels output.
Hold new GRASP tooling to that bar — check it against artefacts that already exist.

## Exercise grading is two-tier

`AnswerChecker` settles what it can (numerics, vectors, matrices, booleans, normalised LaTeX).
Everything else goes to me.

Order: rules -> SymPy -> tutor. A definite verdict stops the chain; `unverified` passes it on.

**The one inviolable rule: an answer the checker cannot parse returns `unverified`, never
`incorrect`.** Marking correct work wrong because the parser is limited would destroy trust in
every other verdict. `tests/checker.test.ts` pins this down.

An exercise with `explain.required: true` always reaches me even when the value checks out,
because on those questions the reasoning is the thing being taught.

## Teaching workflow

1. `pnpm tutor` — see what is waiting.
2. `pnpm tutor <n>` — read it with the exercise, the expected answer and their attempt together.
3. `pnpm tutor:reply <n> "…"` or `pnpm tutor grade <n> <verdict> "…"`.
4. When they are ready for a new topic, write `lessons/<topicId>.mdx` and
   `exercises/<topicId>.yaml`. The navigator picks it up automatically.

Progress lives in the event log, so I no longer reconstruct context by re-reading a checklist.

## Roadmap

M0/M1 (built): foundation, content pipeline, lesson reader, exercise runner, event log, bridge.
M2: ⌘K palette, mastery dashboard, spaced review. M3: Anthropic API tutor.
M4 (partly done): SymPy checking landed; TALYS and EXFOR still to come.
M5: SQLite, auth, deploy.

## Performance notes

Server actions on the hot path (`submitAnswer`, `revealSolution`) deliberately skip
`revalidatePath`. Revalidating recompiles the lesson MDX and re-renders the 219-topic navigator,
which took a submission from 1s to 14s in dev while changing nothing the learner could see — the
card renders its own verdict and later grades arrive over the live stream. Keep it that way;
only use revalidation where lock states actually change, as in `passCheckpoint`.

**Restart the dev server after changing a Zod schema or adding a route.** Next's HMR keeps a
stale copy of the module: a new `check.type` will validate fine under `pnpm validate:content`
(fresh process) while the running server rejects it with a discriminator error listing the old
values. If a brand-new lesson URL 404s or 500s while existing ones work, it is the same thing —
`rm -rf .next` and restart.

**The equation palette lives in `src/components/math/palette.ts`**, one table serving both
editors. MathLive's insert tokens are `#@` (the selection, or the item before the caret) and `#?`
(a placeholder the caret jumps into) — *not* `#0`, which is macro-argument syntax and silently
produces an empty slot. So the superscript button is `#@^{#?}`: it takes what you just typed as
the base and drops you in the exponent. `tests/palette.test.ts` enforces this and rejects `#0`.

**Never reach for a component's DOM node with `document.querySelector`.** A lesson page has ~20
math fields and the scratchpad has one per step, so a global lookup silently targets the first one
— the palette inserted into the wrong card and the symptom read as "nothing happens". Use a ref;
`MathField` exposes an imperative handle for exactly this.

One SSE connection per page, never per component. Browsers allow about six per origin over
HTTP/1.1, so a stream per exercise card exhausts the pool and stalls ordinary requests. Consumers
use `useThreadMessages` from `TutorStream`, which fans out a single topic-scoped stream.
