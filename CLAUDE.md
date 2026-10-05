# Apps monorepo

A pnpm workspace holding independent, separately deployed tutoring apps that share code where it
is genuinely subject-agnostic and diverge everywhere else.

```
apps/
  hub/                   The launcher: one screen listing every course, with live progress, a
                         deep "continue where you left off" link per course, and the command to
                         start any server that is down. Reads the others off disk; imports no
                         app's code. See apps/hub/CLAUDE.md.
  physics-instructor/   Research-level nuclear/atomic physics, English + Arabic, Claude Code
                         tutor bridge. See apps/physics-instructor/CLAUDE.md.
  physics-eg/            Egyptian 3rd-secondary physics, Arabic only, drag-and-build circuit
                         simulator. See apps/physics-eg/CLAUDE.md.
  chinese-tutor/          Mandarin from scratch, English interface — pinyin, vocabulary, grammar,
                         writing practice, the same live tutor bridge. See apps/chinese-tutor/CLAUDE.md.
  russian-tutor/          Russian from scratch, English interface — Cyrillic, stress, cases, verb
                         aspect, the same live tutor bridge. See apps/russian-tutor/CLAUDE.md.
  spanish-tutor/          Spanish from scratch, English interface — pronunciation, gender agreement,
                         ser/estar, conjugation, the same live tutor bridge. See apps/spanish-tutor/CLAUDE.md.
packages/
  core/                  Syllabus/prerequisite-graph model, exercise schema, the append-only
                          progress log and its reducer, scratchpads, port interfaces.
  checker/               The rule-based AnswerChecker (numerics, vectors, matrices, LaTeX, and
                          plain exact/multichoice/truefalse/tutor matching for non-math subjects).
  circuit-sim/           DC resistive-circuit solver (modified nodal analysis) — physics-eg's,
                          but subject-agnostic in principle if a future app needs circuits too.
  scratchpad/            Step-by-step derivation checking (each line against the one before it)
                          plus the filesystem repository for saved pads — the repository alone is
                          reused by both language apps' free-writing practice, without the step
                          checker (built for algebra, doesn't fit a written sentence).
  tutor-bridge/          The claude-code file-bridge TutorTransport, the SSE stream helper (with
                          its own reconnect-on-drop logic), and the React hooks that fan one
                          stream out to a page's exercises and, in the language apps, a
                          persistent side-panel chat.
  math-ui/               Equation *input* — MathLive wrapper, the visual/LaTeX toggle, the
                          insert-token palette. (Read-only KaTeX rendering stays per-app.)
  review/                Spaced-repetition review: the card schema, the SM-2-derived scheduler,
                          the append-only review-event log and its reducer, and a filesystem
                          adapter — used by both language apps' `/review` (flashcards, a mistakes
                          bucket, and a cumulative quiz over everything studied so far).
```

The `@physics/*` npm scope on shared packages is a historical artifact of which app existed first,
not a claim that the code is physics-specific — `chinese-tutor` and `russian-tutor` are proof it
isn't.

**Read the app's own CLAUDE.md before working in it** — that is where the commands, content rules
and gotchas specific to that app live. This file only covers what spans all of them.

## Working across the boundary

Each package's `README.md` states its own scope: what belongs there (identical regardless of
subject) and what deliberately does not (anything an app would answer differently). When something
looks like it should be shared but currently lives duplicated in one app, that is often deliberate —
see each package's README for "prove the shape against a second consumer before extracting it
further." Don't move code into a shared package speculatively; extract it once two real call sites
actually need the same thing.

When building a new language-learning app, `chinese-tutor`'s CLAUDE.md and content are the
reference shape — `russian-tutor` was built by cloning that structure and replacing exactly the
subject-specific pieces (pinyin/tone → stress/case, `ToneDemo` → `StressDemo`, `containsHanzi` →
`containsCyrillic`), and `spanish-tutor` by cloning `russian-tutor` in turn. Everything else — the
tutor bridge, the side chat, practice pads, the review system, the exercise schema and checker —
carried over unchanged. The subject-specific surface is small and always the same four things:
one pure domain helper that makes a lesson-printed form testable (`toneMarkPinyin`, `markStress`,
`conjugatePresent`), one "compare these side by side" demo component, the TTS voice picker, and
how a block decides which text is the target language (a Unicode range for Chinese and Russian;
an explicit `speakColumns` prop for Spanish, since it shares an alphabet with the interface).
Clone whichever sibling is most recent — it has every later fix in it — and note that
`tar --exclude=content` also matches `src/adapters/content/`; copy that directory back.

**Then give the new app its own look — but keep the proven shape, and keep colour restrained.**
Cloning is how the plumbing gets there, not how the app should end up: three language sites that
differ only in their labels read as one template. Each app carries a distinct palette, typeface
and ornament — chinese-tutor is warm paper and a muted gold accent, russian-tutor is warm paper
and a deep cobalt accent, spanish-tutor is Mediterranean cream, terracotta and azulejo tiles.

What they share is the **layout and the colour discipline**, and both were learned the hard way
across two bad passes on Chinese and Russian. The first pass on each was a full-blown pastiche — a
printed book with dotted-leader contents and a vertical spine, and a constructivist poster of
black bars and blanket uppercase. Both looked striking in a screenshot and were rejected on sight
in use: dense, low-contrast, tiring. The second pass fixed the layout, built on spanish-tutor's
shape, but kept a near-crimson, high-chroma red as each accent, filled solid down headers, bands
and numbered badges, with a separate saturated green for "done" sitting right next to it — still
loud, and red against green at matching chroma is close to the worst possible colour pairing.

**Start a new app from spanish-tutor's shape**: a hero with the next lesson as one accent card,
then the course as a path of numbered nodes down a vertical rule, every lesson a pill that is
dashed when unwritten, a plain neutral outline once written, and solid ink with a tick once read.
Pick one accent colour, well clear of the stop-sign red family and at a moderate chroma (0.09-0.16
in OKLCH, not 0.19+) — then use it sparingly: the primary button, small marks, links, a thin rule.
Never give "done" a second hue; fill it with `ink` instead, and leave `success`/`danger` alone for
their one real job, exercise right/wrong feedback. See each app's own CLAUDE.md.

The identity is deliberately cheap to carry, because it lives in four places and nowhere else:
`src/app/globals.css` (`@theme` tokens, including an app-wide `--radius-*` scale so every
`rounded-*` utility in every component follows the house style without naming a radius),
`src/app/layout.tsx` (the two `next/font` families behind `--font-sans` and `--font-display`),
the chrome (`Header`, `Sidebar`, `app/page.tsx`), and a small `src/lib/titles.ts` that splits
"Phase 1 — Foundations" into a number and a name for that app's own numbering. Everything
below the chrome — exercise cards, MDX blocks, the review and practice pages — reads semantic
tokens (`accent`, `surface`, `fg-muted`) and re-skins itself. Keep it that way: a component that
names a colour or a radius directly is what makes the next app expensive.

## Commands (repo root)

```bash
pnpm install               # once, from the root — installs every workspace project
pnpm dev                   # the hub alone, on :3000 — the front door
pnpm dev:all               # the hub and all five courses, in parallel
pnpm --filter <name> dev   # one app: hub, physics-instructor, physics-eg, chinese-tutor, …
pnpm -r test                # every project's tests
pnpm -r lint && pnpm -r typecheck
```

Ports: hub on 3000, physics-instructor on 3100, physics-eg on 3200, chinese-tutor on 3300,
russian-tutor on 3400, spanish-tutor on 3500 — chosen so all six can run at once.

**A new app must register itself with the hub**, or it exists but nothing links to it: add one
entry to `COURSES` in `apps/hub/src/lib/courses.ts` (directory, port, syllabus id, native and
English names, blurb, mark, accent pair). The hub reads everything else — title, topic count,
which lessons are written, what has been read — off that app's own `syllabus.yaml`,
`lessons/*.mdx` and `data/events.jsonl`, so nothing else is needed and nothing else can drift.

**The link has to go both ways.** Give the new app a `src/lib/hub.ts` exporting
`HUB_URL = 'http://localhost:3000'`, and a small grid-icon `<a href={HUB_URL}>` (a plain anchor,
not a framework `Link` — it crosses to a different dev server) in its header, so a student can
always get back to the launcher in one click. Every existing app does this already.

**"Continue" means the lesson literally last open, not the next unfinished one** — the way a game
remembers which level you were on rather than suggesting the next one. Every course app's own home
page and the hub's own tile both resume to `mostRecentTopic(progress)` (from `@physics/core/domain`,
or its local equivalent in physics-instructor — see that app's own `src/core/domain/progress.ts`
for why that one is duplicated rather than imported), falling back to the first written lesson only
when nothing has ever been touched. A new app's home page should do the same, not reinvent a
next-unread heuristic.
