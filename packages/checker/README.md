# @physics/checker

A rule-based `AnswerChecker` (numerics, vectors, matrices, booleans, normalised LaTeX, and a
"parallel to this direction" check for eigenvector-style questions), plus `CompositeAnswerChecker`
to chain it ahead of something smarter (a CAS, a tutor).

The one rule that matters everywhere this is used: **an answer the checker cannot parse returns
`unverified`, never `incorrect`.** An unparseable answer is a limitation of the checker, not a
mistake by the learner — marking it wrong would destroy trust in every other verdict. Every check
type in `rules.ts` is written to that discipline, and `tests/rules.test.ts` pins it down for each
one.

Depends on `@physics/core` for the `Check`/`AnswerChecker` types it implements against, and
nothing else — no filesystem, no framework.
