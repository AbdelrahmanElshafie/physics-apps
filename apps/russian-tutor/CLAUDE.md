# Russian, from scratch

A personal Russian-learning app: an English-interface course that teaches Russian from zero — the
Cyrillic alphabet, stress, vocabulary, grammar, and writing — built on the same tutor-bridge
architecture as the other apps in this monorepo. Sibling to `physics-instructor`, `physics-eg`,
and `chinese-tutor`, same pnpm workspace, sharing what is genuinely subject-agnostic via
`packages/`. `chinese-tutor`'s own CLAUDE.md and content are the closest reference for the shape
of this app — read that first if something here is unclear, most of the reasoning carries over.

## What makes this app different from chinese-tutor

- **Stress, not tone, is the hard pronunciation problem.** Russian has no tones; instead, word
  stress is unmarked in ordinary writing, lands unpredictably on any syllable, and changes how
  unstressed vowels are even pronounced (akanye: unstressed о → "a"). `src/core/domain/stress.ts`
  exports `markStress`, the Russian equivalent of chinese-tutor's `toneMarkPinyin` — content is
  authored with the stressed vowel followed by an apostrophe (`привет` → `прив'ет`), and the
  function produces the properly accented display form (`приве́т`, via a combining acute accent,
  U+0301). See `tests/stress.test.ts` for the same "a mark a lesson prints is a mark a test
  checks" discipline chinese-tutor applies to pinyin.
- **`StressDemo` replaces `ToneDemo`.** Same motivation — a single audio clip doesn't teach an
  ear to compare — but the visual anchor is different: instead of a pitch-contour SVG (Russian
  stress has no pitch shape, just emphasis and vowel quality), the stressed vowel itself is bolded
  in the pronunciation line. Used for stress-only minimal pairs like за́мок ("castle") vs. замо́к
  ("lock") — same five letters, different word.
- **No CJK-specific styling.** `hanzi-display` became the generic `.word-display` (Cyrillic needs
  no special font stack or display size the way logographic characters arguably do) and
  `containsHanzi` became `containsCyrillic` (Unicode range `Ѐ`–`ӿ`), used the same way:
  gating which exercise choices and table cells get a speak button.

## Watching a student write, not just grading multiple choice

Identical mechanism to chinese-tutor and both physics apps, via `@physics/tutor-bridge`:

- **The tutor bridge.** `submitAttempt` escalates to the tutor whenever `needsTutorReview` (an
  exercise with `explain.required`, or `check.type: 'tutor'`) or the checker returns anything
  other than `correct`. `pnpm tutor` lists what's waiting, `pnpm tutor <n>` shows the question
  with its exercise and expected answer, `pnpm tutor:reply <n> "…"` answers it and the reply
  streams into the open page with no refresh.
- **One persistent side chat**, open from any page (`TutorSidePanel`, threaded on the fixed
  `general` topic) — not scoped to whichever lesson happens to be open.
- **Practice pads**, at `/practice`. Free-form writing — a sentence, a short dialogue, an attempt
  at a translation — with "ask your tutor" sending the whole pad, inlined, to the same queue.
- **`pnpm tutor profile`** — every topic touched, mastery, and every exercise not yet settled
  correct — so a reply in the open-ended chat (which carries no exercise context of its own) can
  actually reference real progress instead of answering blind.

Pronunciation audio works the same way too: `SpeakButton` (`src/components/audio/`) uses the
browser's own `speechSynthesis`, picking the best available `ru-RU` voice (Chrome ships a genuine
Google cloud voice for Russian) rather than any API or hosted audio file.

## Commands

```bash
pnpm dev                  # localhost:3400
pnpm validate:content     # schema + prerequisite-graph check
pnpm test
pnpm lint && pnpm typecheck
pnpm tutor                # list questions waiting on you, plus a one-line progress summary
pnpm tutor profile        # full picture: every topic, mastery, every outstanding mistake
pnpm tutor <n>            # read question n in full, with its exercise and expected answer
pnpm tutor:reply <n> "…"  # answer it; appears in their browser immediately, no refresh
pnpm tutor grade <n> correct|partial|incorrect "feedback"
```

## What comes from packages/

`@physics/core` — syllabus/graph/exercise/progress/scratchpad/ports, fully subject-agnostic.
`@physics/checker` — only `exact`/`multichoice`/`truefalse`/`tutor` check types are used here.
`@physics/scratchpad` — storage only for `/practice`, not its step-by-step chain checker (built
for algebra, doesn't fit a written sentence — see chinese-tutor's CLAUDE.md for the full
reasoning, it applies identically here). `@physics/tutor-bridge` — the file-bridge transport, the
SSE stream (with its own reconnect-on-drop logic — see the package's own history), and the React
hooks. This app's own `src/core/domain` adds `stress.ts` — see above.

## Content

Same shape as every other app:

```
content/syllabi/<id>/
  syllabus.yaml            phases > modules > topics, with a prerequisite DAG
  lessons/<topicId>.mdx
  exercises/<topicId>.yaml
```

The `russian` syllabus (`content/syllabi/russian/syllabus.yaml`) is a full five-phase roadmap —
21 topics, ending with word order and real sentences — but only `cyrillic-alphabet`, `greetings`,
and `stress-and-vowel-reduction` have lessons written so far. Every other topic is real (ordered,
with real prerequisites and summaries) but shows "this lesson hasn't been written yet" until its
`.mdx` file exists.

### Content rules

**Author stress with an apostrophe right after the stressed vowel** (`здравствуйте` →
`здра'вствуйте`), never a hand-typed combining accent — `markStress` is what produces the display
form, and content is tested against it the same way pinyin content is tested against
`toneMarkPinyin`. A monosyllabic word (да, нет) needs no apostrophe at all.

**Cases and aspect are the real content debt**, not polish — `introduction-to-cases` through
`prepositional-case`, and `verb-aspect-intro`, are the topics an actual course cannot skip past
with placeholders for long. When picking what to write next, these should outrank filling in
easier vocabulary-only topics (numbers, dates) if forced to choose.

## Architecture

Same ports-and-adapters shape as every sibling app, enforced the same way
(`no-restricted-imports` on `src/core/**`): `src/core/domain` and `src/core/ports` stay pure;
`src/adapters/*` are the only things touching the filesystem; `src/container.ts` is the only
place naming a concrete adapter.
