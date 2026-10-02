# Hub — the launcher

One screen that lists every course in this workspace and opens any of them. It is the front door:
`pnpm dev` at the repo root starts this and nothing else, on **localhost:3000**.

It is deliberately the smallest app here. No tutor bridge, no review system, no content of its
own, no tests — it reads, it links, and that is all. If something in the hub starts needing a
port or an adapter, that is a sign the feature belongs in a course app instead.

## What it shows

- **A tile per course**, carrying that course's own accent colour so a tile looks like the app it
  opens. Each tile shows lessons read out of total, lessons written, the dev server's port and
  whether it is up, and when the course was last touched.
- **A Continue button** that deep-links to the specific lesson to resume — the first *written*
  lesson not yet viewed — not just the app's home page. The tile as a whole still opens the home
  page; the button is a second, deeper target.
- **A resume strip** above the grid for whichever course was touched most recently, so the common
  case ("carry on with what I was doing") is one click from a cold start.
- **The start command** on any course whose server is not running, e.g.
  `pnpm --filter russian-tutor dev`, instead of a dead link.
- **Number keys 1–5** open the matching tile (`NumberShortcuts`, the one client component).

## How it reads the other apps

`src/lib/courses.ts` is the whole data layer. It never imports another app's code — only the
three things that are already a shared contract, all via `@physics/core`:

| What | Where | Used for |
| --- | --- | --- |
| `syllabus.yaml` + `syllabusFileSchema`/`buildSyllabus` | `apps/<dir>/content/syllabi/<id>/` | title, topic list, reading order |
| `lessons/<localTopicId>.mdx` | same folder | which topics are actually written |
| `data/events.jsonl` + `parseEventLine`/`reduceEvents` | `apps/<dir>/` | which topics have been read, last activity |

That is what keeps this a reader rather than a coupling: a course app can change its palette, its
components, its whole UI — as all three language apps just did — and the hub still describes it
correctly without a single edit here.

Paths are resolved from `process.cwd()/..`, i.e. `apps/`, so the hub must be run from its own
directory (which `pnpm --filter hub dev` does).

### The registry

`COURSES` in `src/lib/courses.ts` is the only place a course is declared. Adding a sixth app is
adding one entry: directory, port, syllabus id, the native and English names, a one-line blurb, a
mark character, and the accent pair. Two fields exist because an app diverged and a wrong guess
would fail silently:

- **`lessonPath`** — the route segment that app puts lessons under. Everything uses `lesson`;
  `physics-instructor` uses `learn`, and a deep link built with the wrong word 404s rather than
  erroring, so it is stated rather than assumed.
- **`rtl`** — set for `physics-eg`, whose own interface is Arabic.

Counting written lessons intersects the lesson filenames with the syllabus's topic order, which is
why `physics-instructor`'s Arabic variants (`<topic>.ar.mdx`) don't double-count: they match no
topic id.

### The liveness probe

A `HEAD` request per course, server-side, so there is no CORS question. Two details were learned
the hard way and are worth not re-litigating:

- **The budget is 2.5s, not 1s.** With five sibling dev servers competing for the CPU, a healthy
  Next server occasionally takes over a second to answer, and a tile that flickers to "not
  running" while the app is plainly up is worse than a slower render. A server that genuinely
  isn't listening refuses the connection immediately, so the common case still costs nothing.
- **Redirects are not followed, and any status under 500 counts as up.**
  `physics-instructor` answers `/` with a 307 to its first lesson; that is a healthy reply and
  shouldn't cost a second round trip.

The page is `force-dynamic` — it probes servers and re-reads five event logs on every request, so
caching it would defeat the point.

## Visual identity — the dark frame

Every course is a bright, papery thing with a strong colour of its own, so the launcher stays near
black and lets each tile's accent be the only colour on screen. It is a frame, not a sixth design,
and it uses three faces no course uses: Space Grotesk for display, Inter for text, JetBrains Mono
for the shell commands.

A tile's accent travels through one CSS custom property, `--accent`, set inline from the registry;
`.tile`, `.tile-edge` and `.meter` in `globals.css` all read it. Recolouring a course is editing
one string in `courses.ts`.

## Commands

```bash
pnpm dev          # from the repo root: the hub alone, on :3000
pnpm dev:all      # the hub and all five courses, in parallel
pnpm lint && pnpm typecheck
```

There is no `test` script: there is nothing here that isn't either a filesystem read covered by
`@physics/core`'s own tests, or markup.
