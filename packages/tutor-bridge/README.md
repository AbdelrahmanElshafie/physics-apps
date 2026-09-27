# @physics/tutor-bridge

The `claude-code` implementation of `TutorTransport` (the port lives in `@physics/core/ports`): a
question becomes a JSON file in a thread directory, the instructor answers it from a terminal
(`pnpm tutor` in the consuming app), and a filesystem watcher pushes the reply back out — no
server process, no API key, just files.

- `ClaudeCodeTutorTransport` — the adapter. Takes a root directory in its constructor (defaults to
  `data/bridge/threads` under the current working directory) so each app keeps its own bridge.
- `askTutor()` / `threadFor()` — thin helpers so a caller never touches the transport directly and
  thread-naming (`topicId#exerciseId`, `topicId@equationId`) stays in one place.
- `createTutorSSEStream(transport, { topic, thread })` — the server-sent-events framing as a
  standard `Response`, so a Next.js Route Handler (or any fetch-API server) becomes a thin wrapper:
  resolve the transport, call this, return what it gives back.
- `./react` — `TutorStreamProvider` / `useThreadMessages` / `useTutorStream`: one `EventSource`
  connection per page, fanned out to every subscriber, because a browser allows only a handful of
  concurrent connections per origin and a lesson page can have twenty-odd potential listeners.

Latency is honestly declared as `deferred` (`capabilities.latency`) — the UI should show "queued
for review," not a typing indicator, because a human answers these on their own schedule. An
API-backed transport implementing the same port would declare `interactive`/`streaming`, and any
component built against `capabilities` (never against `transport.id`) switches behaviour on its own.

Not here: the CLI (`pnpm tutor`) that lists and answers pending questions — that stays app-local,
since it needs each app's own content/exercise lookup to show a question with its exercise and
expected answer, and per the project's own convention this is duplicated by hand across the two
apps until a third real difference proves what the shared shape should be, not before.
