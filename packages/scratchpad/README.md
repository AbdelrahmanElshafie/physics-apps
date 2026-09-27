# @physics/scratchpad

A place for a learner's own derivation, checked **one line against the one before it** rather than
against a final answer. `checkWorking(steps, checker)` walks a step list and reports, per step,
whether it follows from its predecessor — the failure this catches (a sign lost in step three,
carried faithfully through the next five steps) is invisible to an answer-only check.

Deliberately generic over `AnswerChecker` from `@physics/core/ports`: it consults whatever checker
the calling app already has (rules only, or rules + a CAS) and reports `unchecked` — never
`broken` — for anything it cannot verify, the same refusal-to-guess discipline as everywhere else
in this codebase.

`FileSystemScratchpadRepository` stores one JSON file per pad under a root directory the caller
supplies (defaulting to `data/scratch`), write-then-rename so a crash mid-autosave can't leave a
truncated file behind.

The `ScratchpadRepository` port and the `Scratchpad`/`ScratchStep` schema themselves live in
`@physics/core` — this package is the adapter and the checking service built on top of them, not a
second copy of the shape.

Not here: the UI (an equation-input editor belongs in `@physics/math-ui`), and anything that
notifies a tutor — asking for review is a `TutorTransport` concern (`@physics/tutor-bridge`), kept
separate because a scratchpad document and a conversation thread have different lifecycles.
