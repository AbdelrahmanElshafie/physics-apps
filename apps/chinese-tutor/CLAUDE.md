# Mandarin, from scratch

A personal Mandarin-learning app: an English-interface course that teaches Chinese from zero —
pinyin and tones, vocabulary, grammar, and writing — built on the same tutor-bridge architecture
as the physics apps in this monorepo. Sibling app to `physics-instructor` and `physics-eg`, same
pnpm workspace, sharing what is genuinely subject-agnostic via `packages/`.

## What makes this app different from the physics apps

- **English interface, Mandarin subject.** Unlike `physics-eg` (Arabic UI for an Arabic-speaking
  audience), the learner here is an English speaker, so the app chrome, exercise prompts, and
  tutor messages are in English — only the content being taught is Chinese. No RTL, no bidi
  overrides: Chinese and English are both left-to-right.
- **No math.** No KaTeX, no MathLive, no `@physics/math-ui`, no `@physics/circuit-sim` — exercises
  are multiple-choice, true/false, and typed text (pinyin or characters), which the shared
  `exact`/`multichoice`/`truefalse`/`tutor` check types already cover without any LaTeX-specific
  normalization getting in the way.
- **Typed answers are numbered pinyin.** A learner types `ni3 hao3`, not `nǐ hǎo` — no diacritic
  keyboard required. Lessons *display* the toned form, produced by `toneMarkPinyin` in
  `src/core/domain/pinyin.ts` from the same numbered string an exercise checks against, so a
  pinyin a lesson prints is a pinyin a test checks — the same discipline the physics apps apply to
  worked numeric values, applied here to transcription instead.
- **Practice, not a scratchpad.** `@physics/scratchpad`'s storage and schema are reused as-is (a
  pad is a title plus an ordered list of text entries), but *not* its step-by-step "does this line
  follow from the last" checker — that's built for algebra, where a line is judged against the one
  before it. A written sentence has no "previous line" to be consistent with; it just needs a
  human read. So `/practice` is free writing + "ask your tutor", with no local verdict.

## Watching a student write, not just grading multiple choice

Same two mechanisms as the physics apps, via `@physics/tutor-bridge` (the npm scope is a
historical artifact of which app existed first, not a claim the code is physics-specific — see
the package's own README):

- **The tutor bridge.** `submitAttempt` escalates to the tutor whenever `needsTutorReview` (an
  exercise with `explain.required`, or `check.type: 'tutor'` — translations and short-answer
  explanations) or the checker returns anything other than `correct`. `pnpm tutor` lists what's
  waiting, `pnpm tutor <n>` shows the question with its exercise and expected answer, `pnpm
  tutor:reply <n> "…"` answers it and the reply streams into the open page with no refresh.
- **Practice pads**, at `/practice`. Free-form writing — a sentence, a short dialogue, an attempt
  at a translation — with "ask your tutor" sending the whole pad, inlined, to the same queue.

## Spaced-repetition review, at `/review`

Built on `@physics/review` (SM-2-derived scheduler, append-only review-event log, a filesystem
adapter) plus this app's own `ReviewContentPort`/`FileSystemReviewContentRepository`
(`src/core/ports/review-content.ts`, `src/adapters/content/fs-review/`), which reads the fourth
content file per topic — see **Content** below.

- **Flashcard review** (`/review/session?mode=due`) mixes cards that are due with new ones, capped
  at 40 per session; grading (Again / Hard / Good / Easy) appends one event, scheduled the Anki way.
- **Practice mistakes** (`/review/session?mode=mistakes`) is just cards currently lapsed
  (`isLapsed` from `@physics/review`) — failed recently and not yet recovered — plus, on the
  `/review` dashboard itself, every lesson exercise still sitting on a non-correct verdict that
  *isn't* already represented by a card (the same "not yet settled correct" computation
  `pnpm tutor profile` does on the command line, now surfaced in the UI too, linking back to the
  exact exercise via the `id="exercise-<id>"` anchor on `ExerciseCard`).
- **Big quiz** (`/review/quiz`) turns every card from every lesson reached into an auto-generated
  multichoice question (distractors sampled from other cards of the same kind) — fully
  computer-graded, no tutor round-trip, and each answer still feeds the same scheduler (correct →
  `good`, incorrect → `again`).
- A card's `exerciseIds` links it to the lesson exercise(s) that test the same word, purely by
  string id declared in the review YAML — the shared `exerciseSchema` never needs to know review
  cards exist.

## Commands

```bash
pnpm dev                  # localhost:3300
pnpm validate:content     # schema + prerequisite-graph check
pnpm test
pnpm lint && pnpm typecheck
pnpm tutor                # list questions waiting on you   <- check this every session
pnpm tutor <n>            # read question n in full, with its exercise and expected answer
pnpm tutor:reply <n> "…"  # answer it; appears in their browser immediately, no refresh
pnpm tutor grade <n> correct|partial|incorrect "feedback"
```

## What comes from packages/

`@physics/core` — syllabus/graph/exercise/progress/scratchpad/ports, fully subject-agnostic.
`@physics/checker` — the rule-based `AnswerChecker`; only its `exact`/`multichoice`/`truefalse`/
`tutor` check types are used here (`numeric`/`vector`/`matrix`/`latex` exist in the shared schema
but nothing in this app's content uses them). `@physics/scratchpad` — storage only, see above.
`@physics/tutor-bridge` — the file-bridge transport, the SSE stream, and the React hooks, used
exactly as both physics apps use them. `@physics/review` — the review-card schema, scheduler, and
event log behind `/review`; see above. This app's own `src/core/domain` adds one pure helper,
`pinyin.ts` (numbered pinyin -> tone-marked pinyin) — see `tests/pinyin.test.ts`.

## Content

Same shape as the physics apps:

```
content/syllabi/<id>/
  syllabus.yaml            phases > modules > topics, with a prerequisite DAG
  lessons/<topicId>.mdx
  exercises/<topicId>.yaml
  review/<topicId>.yaml    optional — flashcard/quiz cards for that topic (see below)
```

The `mandarin` syllabus (`content/syllabi/mandarin/syllabus.yaml`) is a full roadmap — five
phases, HSK1-ish in scope, 21 topics. Thirteen are written, and **the grammatical spine of the
course is complete**: sounds (`pinyin-and-tones`, `tone-pairs`), the writing system
(`strokes-and-radicals`), the 是/很 split (`introducing-yourself`, `how-are-you`), numbers and
measure words (`numbers-0-99`, `pronouns-and-measure-words`, `this-that-de`), the first real
verbs (`have-and-want`), and all of Module 5.1 (`word-order`, `questions-ma-ne`, `negation`).
Every other topic is real (ordered, with real prerequisites and summaries) but shows "this lesson
hasn't been written yet" until its `.mdx` file exists — adding a lesson is adding that one file
plus its matching exercises YAML and review deck.

The written lessons cross-reference deliberately, along one thread: measure words are introduced
for numbers and reused unchanged for 这/那/哪; 是-for-nouns-only is planted in
`introducing-yourself` and paid off in `how-are-you`; 没有 is taught as a fixed unit in
`have-and-want` so the 不/没 rule in `negation` lands on something already automatic; the 不 → bú
sandhi from `tone-pairs` recurs in 不太好, 不是 and 不要, and the 一 sandhi that `tone-pairs`
deferred is finally delivered in `have-and-want`. **Keep that thread intact when editing** — a
change to how one lesson frames measure words or 是 has knock-on claims in three or four others.

**What's left** (`simplified-vs-traditional`, `family-members`, `dates-and-days`, `telling-time`,
`ordering-food`, `likes-and-dislikes`, `places-in-town`, `asking-directions`) is vocabulary breadth
on top of a finished grammar spine, and can be written in any order. The one with real grammar in
it is `likes-and-dislikes`: 喜欢 takes a verb as its object as readily as a noun, which is the
first verb-as-object construction in the course — treat that as its content, not the vocabulary.

### Content rules

**Every typed pinyin answer is the numbered form**, e.g. `check: { type: exact, value: ni3hao3 }`
— the `exact` checker's normalization strips whitespace, so `ni3 hao3` and `ni3hao3` compare
equal; write exercises with spaces for readability, the comparison doesn't care. **Avoid neutral
tone in typed-pinyin exercises where the numbering is ambiguous** (e.g. the second syllable of
谢谢) — dictionaries disagree on whether to number an unstressed repeated syllable, and an exact
string match has no room for that disagreement. Stick to syllables with an unambiguous dictionary
tone.

**Simplified characters only**, matching `simplified-vs-traditional`'s own content — don't mix in
traditional forms elsewhere in the syllabus without a reason tied to that lesson.

**A review card's `frontPronunciation` carries no punctuation**, even when the `front` does:
`front: 你叫什么名字?` pairs with `frontPronunciation: Nǐ jiào shén me míng zi`. This isn't
cosmetic — `toneMarkPinyin`'s syllable regex anchors the tone digit at the end of the token, so a
raw `zi5?` doesn't match and passes through with the digit still in it. (Russian's `markStress`
slices around the apostrophe and so does tolerate trailing punctuation; the two apps differ here.)

**Review cards are hand-authored, not scraped from the lesson MDX.** `review/<topicId>.yaml` is a
plain list of `{ id, kind: letter|word|sentence, topicId, front, frontPronunciation?, back,
audioText?, exerciseIds? }` cards, validated by `reviewCardSchema` from `@physics/review`. Author
`frontPronunciation` as numbered pinyin's *output*, not hand-typed accents — `tests/review-content.test.ts`
asserts every card's pronunciation matches `toneMarkPinyin` of a raw numbered form registered in
that test file, the same discipline `tests/pinyin.test.ts` applies to lesson prose. A card's
`exerciseIds` only needs to name real exercise ids in that topic's exercises YAML —
`pnpm validate:content` checks this, along with topicId validity and duplicate card ids.

## Architecture

Same ports-and-adapters shape as both physics apps, enforced the same way (`no-restricted-imports`
on `src/core/**`): `src/core/domain` and `src/core/ports` stay pure; `src/adapters/*` are the only
things touching the filesystem; `src/container.ts` is the only place naming a concrete adapter.
