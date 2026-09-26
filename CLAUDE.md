# Physics apps — monorepo

A pnpm workspace holding two independent, separately deployed physics-tutoring apps that share
code where it is genuinely subject-agnostic and diverge everywhere else.

```
apps/
  physics-instructor/   Research-level nuclear/atomic physics, English + Arabic, Claude Code
                         tutor bridge. See apps/physics-instructor/CLAUDE.md.
  physics-eg/            Egyptian 3rd-secondary physics, Arabic only, drag-and-build circuit
                         simulator. See apps/physics-eg/CLAUDE.md.
packages/
  core/                  Syllabus/prerequisite-graph model, exercise schema, the append-only
                          progress log and its reducer, scratchpads, port interfaces.
  checker/               The rule-based AnswerChecker (numerics, vectors, matrices, LaTeX).
  circuit-sim/           DC resistive-circuit solver (modified nodal analysis) — physics-eg's,
                          but subject-agnostic in principle if a future app needs circuits too.
```

**Read the app's own CLAUDE.md before working in it** — that is where the commands, content rules
and gotchas specific to that app live. This file only covers what spans both.

## Working across the boundary

Each package's `README.md` states its own scope: what belongs there (identical regardless of
subject) and what deliberately does not (anything an app would answer differently). When something
looks like it should be shared but currently lives duplicated in one app, that is often deliberate —
see each package's README for "prove the shape against a second consumer before extracting it
further." Don't move code into a shared package speculatively; extract it once two real call sites
actually need the same thing.

## Commands (repo root)

```bash
pnpm install               # once, from the root — installs every workspace project
pnpm --filter <name> dev   # e.g. physics-instructor, physics-eg
pnpm -r test                # every project's tests
pnpm -r lint && pnpm -r typecheck
```

Ports: physics-instructor on 3100, physics-eg on 3200 — chosen so both can run at once.
