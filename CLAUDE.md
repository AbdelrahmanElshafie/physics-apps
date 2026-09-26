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
`Derivation`+`Step`, `Definition`, `Symbol` (glossary tooltip), `VectorPlot`. Registered in
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

One SSE connection per page, never per component. Browsers allow about six per origin over
HTTP/1.1, so a stream per exercise card exhausts the pool and stalls ordinary requests. Consumers
use `useThreadMessages` from `TutorStream`, which fans out a single topic-scoped stream.
