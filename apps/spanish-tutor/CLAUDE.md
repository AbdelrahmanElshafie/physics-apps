# Spanish, from scratch

A personal Spanish-learning app: an English-interface course that teaches Spanish from zero —
pronunciation and spelling, gender and agreement, ser vs. estar, conjugation, and real sentences —
built on the same tutor-bridge architecture as the other apps in this monorepo. Sibling to
`physics-instructor`, `physics-eg`, `chinese-tutor` and `russian-tutor`, same pnpm workspace,
sharing what is genuinely subject-agnostic via `packages/`. It was built by cloning
`russian-tutor` (the most recent clone of the `chinese-tutor` reference shape, with every later
fix already in it) and replacing exactly the subject-specific pieces listed below.

## What makes this app different from chinese-tutor and russian-tutor

- **Spelling is pronunciation.** Pinyin and Russian stress were a hidden reading layer that had
  to be derived and displayed alongside the script. Spanish has no such layer — accents are part
  of the spelling. So `VocabCard` and `Dialogue` have no `pinyin`/`stressed` field, review cards
  leave `frontPronunciation` unset, and `VocabCard`'s optional `pronunciation` prop exists only
  for the handful of hints an English speaker genuinely needs (silent h, j as an English h, ll).
- **Conjugation is the rule-governed thing worth checking.** `src/core/domain/conjugation.ts`
  exports `conjugatePresent(infinitive, person)` / `presentTable(infinitive)` for regular
  -ar/-er/-ir verbs — this app's equivalent of `toneMarkPinyin`/`markStress`. The discipline is the
  same ("a form a lesson prints is a form a test checks"): `tests/conjugation.test.ts` asserts the
  hablar/comer/vivir tables the lessons print. It is deliberately mechanical and knows nothing
  about irregulars — it produces "so" for ser — so irregular verbs are hand-written in content and
  never routed through it. The tests document that boundary.
- **`AccentDemo` replaces `ToneDemo`/`StressDemo`.** Same motivation — a single audio clip doesn't
  teach an ear to compare — but the anchor is the stressed *syllable*, bolded and underlined, for
  pairs that differ only in stress: hablo/habló (present vs. preterite), el/él, si/sí. Authors
  supply the syllable split explicitly (`syllables: ['ha','bló'], stress: 1`); the component does
  not syllabify, because diphthong/hiatus edge cases aren't worth implementing to show one bold
  syllable.
- **No character-range test for "is this the target language."** `containsHanzi` and
  `containsCyrillic` gated speak buttons by Unicode range. Spanish and English share an alphabet,
  and a heuristic on ñ/á/¿ would miss "hola" and "libro" — the exact words a beginner wants to
  hear. So: `Compare` takes an explicit `speakColumns={[0]}` naming its Spanish columns;
  `GrammarPoint` speaks its pattern by default (pass `speak={null}` to suppress, or `speak="…"`
  to substitute); multichoice choice labels in `ExerciseCard` always get a button (an English
  label read in a Spanish voice is a small cost next to a Spanish one with no button).
- **Nothing CJK- or Cyrillic-specific in styling.** `.word-display` stays as the generic
  display-text class; the `--font-cyrillic` variable and the `cyrillic` font subset are gone.

## Watching a student write, not just grading multiple choice

Identical mechanism to every sibling app, via `@physics/tutor-bridge`:

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
browser's own `speechSynthesis`, preferring an `es-ES` voice (Chrome ships genuine Google cloud
voices for Spanish) rather than any API or hosted audio file.

## Spaced-repetition review, at `/review`

Identical mechanism to the other language apps, built on `@physics/review` plus this app's own
`ReviewContentPort`/`FileSystemReviewContentRepository` reading `review/<topicId>.yaml`:

- **Flashcard review** (`/review/session?mode=due`), **Practice mistakes**
  (`/review/session?mode=mistakes`, lapsed cards plus the open non-card exercise mistakes), and
  the **Big quiz** (`/review/quiz`, every card as an auto-generated multichoice) — see
  chinese-tutor's CLAUDE.md for the full description; nothing differs here.
- Because the quiz draws distractors across every deck, `tests/review-content.test.ts` enforces
  that **no two cards share a `front`** (not just an id) — two cards both fronted "hablo" with
  different backs would hand the student two "right" answers. Disambiguate in the front
  (`"hablo (present)"`, the way the sibling apps use `"замок (castle)"`).

## Commands

```bash
pnpm dev                  # localhost:3500
pnpm validate:content     # schema + prerequisite-graph check, plus review-deck integrity
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
`@physics/scratchpad` — storage only for `/practice`, not its step-by-step chain checker.
`@physics/tutor-bridge` — the file-bridge transport, the SSE stream, and the React hooks.
`@physics/review` — the review-card schema, scheduler and event log behind `/review`. This app's
own `src/core/domain` adds `conjugation.ts` — see above.

## Content

Same shape as every other app:

```
content/syllabi/<id>/
  syllabus.yaml            phases > modules > topics, with a prerequisite DAG
  lessons/<topicId>.mdx
  exercises/<topicId>.yaml
  review/<topicId>.yaml    optional — flashcard/quiz cards for that topic
```

The `spanish` syllabus (`content/syllabi/spanish/syllabus.yaml`) is a full five-phase roadmap of
21 topics, running from pronunciation to two-clause sentences. **Eight lessons are written** —
all of Phase 1 (`pronunciation-and-spelling`, `stress-and-accents`, `gender-and-articles`,
`plurals-and-agreement`), the conversational half of Phase 2 (`greetings`,
`introducing-yourself`, `how-are-you`), and the critical `ser-vs-estar`, each with its exercises
and review deck. Every other topic is real (ordered, with real prerequisites
and summaries) but shows "this lesson hasn't been written yet" until its `.mdx` file exists.
`pnpm validate:content` prints how many remain; treat that line as the progress check.

**What to write first, and why:** the structural spine is `pronunciation-and-spelling` →
`gender-and-articles` → `plurals-and-agreement` (everything else agrees with a noun's gender),
then `ser-vs-estar` (flagged `critical` — the distinction English speakers get wrong longest),
then the present-tense chain `present-tense-ar` → `present-tense-er-ir` →
`irregular-verbs-core`, which unlocks all of Phase 5. `stress-and-accents` is small but gates
`preterite-intro`, because hablo/habló is the preterite's whole difficulty. Vocabulary-breadth
topics (numbers, dates, greetings beyond the basics) can be written in any order after that.

### Content rules

**Regular conjugation tables are checked, irregular ones are not.** Any lesson that prints the
full present tense of a regular verb should have that verb in `tests/conjugation.test.ts`,
asserted against `presentTable`. Irregular verbs (ser, estar, tener, ir, querer, hacer…) are
written by hand and must never be passed through `conjugatePresent` — it will cheerfully produce
"so" for ser.

**Accents are content, not decoration.** `está`/`esta`, `él`/`el`, `qué`/`que`, `habló`/`hablo`
are different words. Every typed exercise answer that carries an accent must be checked with the
accent (`check: { type: exact, value: está }`), and the lesson should say so when it first
matters. Don't strip accents to make typing easier — that teaches the wrong word.

**Review cards leave `frontPronunciation` unset.** Spanish spelling is the pronunciation. Use the
field only for a genuine hint on an irregular spelling, never as a routine second line.

**Both the ¿ ¡ marks and the closing ones.** Questions and exclamations are written ¿…? and ¡…!
in lesson text, dialogue, and card fronts — a question without the opening ¿ is a spelling error
in Spanish, and the course should model the orthography it teaches.

**Spain vs. Latin America is noted, not litigated.** The reference accent for audio is es-ES and
the course teaches vosotros alongside ustedes, but every lesson that touches a regional split
(vosotros/ustedes, c/z as /θ/ or /s/) says so in one line and moves on. Don't pick a side in
prose; don't drown the lesson in both.

## Architecture

Same ports-and-adapters shape as every sibling app, enforced the same way
(`no-restricted-imports` on `src/core/**`): `src/core/domain` and `src/core/ports` stay pure;
`src/adapters/*` are the only things touching the filesystem; `src/container.ts` is the only
place naming a concrete adapter.
