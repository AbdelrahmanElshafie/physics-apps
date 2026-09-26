# @physics/core

The subject-agnostic half of both apps' domain: syllabus trees with a prerequisite DAG, the
exercise schema and grading vocabulary, the append-only progress event log and its reducer,
scratchpad documents, and the port interfaces (`ContentRepository`, `ProgressRepository`,
`AnswerChecker`, `ScratchpadRepository`, `TutorTransport`) that every adapter implements against.

## What belongs here

Anything that would be identical whether the subject were nuclear physics, Egyptian secondary
electricity, or something else entirely: nothing in this package knows what a resistor is, or
what an atomic orbital is. If a change here would require asking "which app am I editing this
for?", it does not belong here — move it back into the app.

## What does not

- **Locale.** Each app owns its own set of supported locales (physics-instructor: English and
  Arabic with a fallback chain; physics-eg: Arabic only). The one place this package touches
  locale is `ContentRepository`, and there it is typed as a plain `string`.
- **Content adapters.** Reading `content/syllabi/**` off disk is the same *shape* in both apps,
  but the two content trees will diverge (different frontmatter needs, different widget
  registries), so each app keeps its own filesystem adapter for now. Revisit extracting it once
  physics-eg's content model has actually stabilised — extracting before a second real user has
  exercised the shape only bakes in the first app's assumptions.
- **UI, rendering, math typesetting, the tutor bridge's transport implementation.** These are
  genuinely reusable too, and are the next candidates for their own packages once physics-eg needs
  them.

## Why source, not a build step

Consumers import `@physics/core` directly against `src/`, via `exports` pointing at `.ts` files.
Next.js needs `transpilePackages: ['@physics/core']` in a consuming app's `next.config.ts` to
compile it; plain `tsx`/`vitest` consumers need no configuration at all. This avoids a build step
that would otherwise sit between every edit here and seeing it in either app.
