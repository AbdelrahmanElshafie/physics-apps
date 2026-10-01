# @physics/review

Spaced-repetition review — a card schema, the SM-2-derived scheduler, the append-only review
event log and its reducer, and a filesystem adapter. Built for `chinese-tutor` and `russian-tutor`,
but identical regardless of subject: a card is just a front/back pair with an optional
pronunciation form, never Chinese- or Russian-specific.

`scheduleNext(prevState, grade, now)` is pure — no I/O — and takes a four-button grade (`again` /
`hard` / `good` / `easy`, Anki's own adaptation of SM-2's 0–5 quality scale) rather than a numeric
score, because that is the realistic shape of what a learner can self-report. A card's current
`CardState` (ease factor, interval, due date, lapse count) is never stored directly — it is
`reduceReviewEvents(events)`, derived the same way `@physics/core`'s `ProgressState` is derived
from its own append-only log, for the same reason: history is never destroyed, and changing the
scheduling formula later needs no migration, just a re-replay.

`FileSystemReviewRepository` writes one JSONL file (default `data/review/events.jsonl`), same
write-append-no-read-modify-write technique as the progress log.

**Not here, deliberately:**
- Where cards come from. Reading `content/syllabi/<id>/review/<topicId>.yaml` off disk, validating
  it against `reviewCardSchema`, and deciding which topics' decks exist is app-specific content
  loading — each app's own small `ReviewContentPort`/adapter, the same way lesson/exercise loading
  stays in each app's `src/adapters/content/fs-mdx`, not in `@physics/core`.
- The flashcard/quiz UI. Presentation differs per language (which side gets a pronunciation line,
  which language a speak button should use) — same reasoning `SpeakButton`, `VocabCard`, and
  `ToneDemo`/`StressDemo` stay app-local despite being shaped alike.
- Linking a card to the exercise that tests it. `ReviewCard.exerciseIds` is just string ids the
  content author supplies; correlating a wrong exercise attempt (from `@physics/core`'s progress
  log) with a card's `exerciseIds` to decide "this needs practice" is an app-level read of two
  logs side by side, not a concern either log needs to know about the other for.
