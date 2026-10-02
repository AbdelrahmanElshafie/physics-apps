import fs from 'node:fs/promises'
import path from 'node:path'

import { parse as parseYaml } from 'yaml'
import {
  buildSyllabus,
  parseEventLine,
  reduceEvents,
  syllabusFileSchema,
  type LearningEvent,
  type Syllabus,
  type TopicId,
} from '@physics/core/domain'

/**
 * The hub reads every sibling app's content and progress straight off disk.
 *
 * It never imports another app's code — only the three things that are already a shared contract:
 * the `syllabus.yaml` schema, the `lessons/<topic>.mdx` filename convention, and the append-only
 * `data/events.jsonl` log, all from `@physics/core`. That keeps this a reader: an app can change
 * its UI, its palette, even its whole component tree, and the hub still describes it correctly.
 */

/** Static facts about a course that are not derivable from its content. */
export interface CourseDefinition {
  /** Workspace directory under apps/, which is also its pnpm filter name. */
  readonly dir: string
  /** Dev-server port, as that app's own package.json pins it. */
  readonly port: number
  /** Folder under content/syllabi/, which is also the syllabus segment of a lesson URL. */
  readonly syllabusId: string
  /**
   * The route segment that app puts lessons under. Every app but physics-instructor uses
   * "lesson"; that one says "learn", and a deep link built with the wrong word 404s rather than
   * failing loudly, so it is stated per course rather than assumed.
   */
  readonly lessonPath?: string
  /** How the course names itself in its own language. */
  readonly native: string
  /** One or two characters for the tile's mark. */
  readonly mark: string
  /** Short English name, for when the native one needs a gloss. */
  readonly label: string
  /** One line about what the course actually teaches. */
  readonly blurb: string
  /**
   * The course's own accent, so a tile looks like the app it opens.
   *
   * Three of the five courses are warm reds in their own apps, and sampled literally the Mandarin
   * and Russian tiles were indistinguishable side by side. Each is still that course's colour, but
   * spread along both hue and lightness (deep red → vermilion → clay) so the grid stays scannable.
   */
  readonly accent: string
  readonly accentSoft: string
  /** Set for a course whose own interface is right-to-left. */
  readonly rtl?: boolean
}

export const COURSES: readonly CourseDefinition[] = [
  {
    dir: 'chinese-tutor',
    port: 3300,
    syllabusId: 'mandarin',
    native: '中文',
    mark: '中',
    label: 'Mandarin',
    blurb: 'Pinyin and tones, characters, measure words, and the grammar spine.',
    accent: 'oklch(0.66 0.185 40)',
    accentSoft: 'oklch(0.66 0.185 40 / 0.16)',
  },
  {
    dir: 'russian-tutor',
    port: 3400,
    syllabusId: 'russian',
    native: 'Русский',
    mark: 'Я',
    label: 'Russian',
    blurb: 'Cyrillic, stress, the six cases, verb aspect, and real sentences.',
    accent: 'oklch(0.57 0.235 21)',
    accentSoft: 'oklch(0.57 0.235 21 / 0.18)',
  },
  {
    dir: 'spanish-tutor',
    port: 3500,
    syllabusId: 'spanish',
    native: 'Español',
    mark: 'ñ',
    label: 'Spanish',
    blurb: 'Sounds and accents, gender, ser and estar, and the verb tables.',
    accent: 'oklch(0.74 0.135 62)',
    accentSoft: 'oklch(0.74 0.135 62 / 0.16)',
  },
  {
    dir: 'physics-instructor',
    port: 3100,
    syllabusId: 'nuclear-physics',
    lessonPath: 'learn',
    native: 'Atomic & Nuclear',
    mark: '⚛',
    label: 'Physics',
    blurb: 'From the mathematics through to published MCDHF calculations.',
    accent: 'oklch(0.68 0.15 200)',
    accentSoft: 'oklch(0.68 0.15 200 / 0.16)',
  },
  {
    dir: 'physics-eg',
    port: 3200,
    syllabusId: 'electricity',
    native: 'الفيزياء',
    mark: 'ف',
    label: 'Physics · Egypt',
    blurb: 'Third-secondary electricity, in Arabic, with a circuit simulator.',
    accent: 'oklch(0.7 0.16 150)',
    accentSoft: 'oklch(0.7 0.16 150 / 0.16)',
    rtl: true,
  },
]

/** A course definition plus everything read off disk for it. */
export interface Course extends CourseDefinition {
  readonly title: string
  readonly subtitle?: string
  readonly topicCount: number
  readonly writtenCount: number
  readonly readCount: number
  /** Where "Continue" goes: the first written lesson not yet viewed, else the first topic. */
  readonly continueHref: string
  readonly continueTitle: string
  /** True when the continue link is a resume rather than a cold start. */
  readonly resuming: boolean
  readonly lastActivityAt?: string
  readonly online: boolean
  /** Set when the course could not be read at all — a missing folder, unparseable syllabus. */
  readonly error?: string
}

const APPS_ROOT = path.resolve(process.cwd(), '..')

const appDir = (course: CourseDefinition) => path.join(APPS_ROOT, course.dir)
const syllabusFile = (c: CourseDefinition) =>
  path.join(appDir(c), 'content', 'syllabi', c.syllabusId, 'syllabus.yaml')
const lessonsDir = (c: CourseDefinition) =>
  path.join(appDir(c), 'content', 'syllabi', c.syllabusId, 'lessons')
const eventsFile = (c: CourseDefinition) => path.join(appDir(c), 'data', 'events.jsonl')

export const originOf = (c: CourseDefinition) => `http://localhost:${c.port}`
export const startCommand = (c: CourseDefinition) => `pnpm --filter ${c.dir} dev`

async function readSyllabus(c: CourseDefinition): Promise<Syllabus> {
  const raw = await fs.readFile(syllabusFile(c), 'utf8')
  return buildSyllabus(syllabusFileSchema.parse(parseYaml(raw)))
}

/** Which topics have a lesson file. One directory listing, not one stat per topic. */
async function readWritten(c: CourseDefinition): Promise<Set<string>> {
  try {
    const entries = await fs.readdir(lessonsDir(c))
    return new Set(entries.filter((e) => e.endsWith('.mdx')).map((e) => e.slice(0, -'.mdx'.length)))
  } catch {
    return new Set()
  }
}

/**
 * A malformed line is skipped rather than failing the whole hub — the logs are hand-editable by
 * design, and losing a course tile to one bad line is the worse failure. Same reasoning as each
 * app's own `FileSystemProgressRepository`.
 */
async function readEvents(c: CourseDefinition): Promise<LearningEvent[]> {
  let raw: string
  try {
    raw = await fs.readFile(eventsFile(c), 'utf8')
  } catch {
    return []
  }
  const events: LearningEvent[] = []
  for (const line of raw.split(/\r?\n/)) {
    try {
      const event = parseEventLine(line)
      if (event) events.push(event)
    } catch {
      // skip
    }
  }
  return events
}

/**
 * Is the dev server up? A HEAD probe, server-side so there is no CORS question.
 *
 * Two details that were learned the hard way. The budget is 2.5s, not 1s: a Next dev server with
 * four siblings competing for the CPU answers in well under a second normally but not always, and
 * a tile that flickers to "not running" while the app is plainly up is worse than a slow render.
 * A server that genuinely is not listening refuses the connection immediately, so the common case
 * still costs nothing. And redirects are not followed — physics-instructor answers / with a 307 to
 * its first lesson, which is a perfectly healthy reply and shouldn't cost a second round trip.
 */
async function probe(c: CourseDefinition): Promise<boolean> {
  try {
    const response = await fetch(originOf(c), {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(2500),
      cache: 'no-store',
    })
    return response.status < 500
  } catch {
    return false
  }
}

const localOf = (topicId: TopicId): string => {
  const at = String(topicId).indexOf(':')
  return at < 0 ? String(topicId) : String(topicId).slice(at + 1)
}

async function loadOne(c: CourseDefinition): Promise<Course> {
  const [online, syllabusResult, written, events] = await Promise.all([
    probe(c),
    readSyllabus(c).then(
      (s) => ({ ok: true as const, syllabus: s }),
      (cause: unknown) => ({ ok: false as const, message: (cause as Error).message }),
    ),
    readWritten(c),
    readEvents(c),
  ])

  if (!syllabusResult.ok) {
    return {
      ...c,
      title: c.label,
      topicCount: 0,
      writtenCount: 0,
      readCount: 0,
      continueHref: originOf(c),
      continueTitle: 'Open the app',
      resuming: false,
      online,
      error: syllabusResult.message,
    }
  }

  const syllabus = syllabusResult.syllabus
  const progress = reduceEvents(events)
  const viewed = (id: TopicId) => progress.topics.get(id)?.viewed ?? false

  const order = syllabus.order
  const writtenIds = order.filter((id) => written.has(localOf(id)))
  const next = writtenIds.find((id) => !viewed(id)) ?? writtenIds[0] ?? order[0]
  const nextTopic = next ? syllabus.topics.get(next) : undefined

  return {
    ...c,
    title: syllabus.title,
    ...(syllabus.subtitle ? { subtitle: syllabus.subtitle } : {}),
    topicCount: order.length,
    writtenCount: writtenIds.length,
    readCount: order.filter(viewed).length,
    continueHref: next
      ? `${originOf(c)}/${c.lessonPath ?? 'lesson'}/${c.syllabusId}/${localOf(next)}`
      : originOf(c),
    continueTitle: nextTopic?.title ?? 'Open the app',
    resuming: Boolean(next && writtenIds.some(viewed)),
    ...(progress.lastActivityAt ? { lastActivityAt: progress.lastActivityAt } : {}),
    online,
  }
}

/** Every course, in the order the registry lists them. Probes and reads run concurrently. */
export async function loadCourses(): Promise<Course[]> {
  return Promise.all(COURSES.map(loadOne))
}

/** The course touched most recently, for the "pick up where you left off" slot. */
export function mostRecent(courses: readonly Course[]): Course | undefined {
  const withActivity = courses.filter((c) => c.lastActivityAt)
  if (withActivity.length === 0) return undefined
  return withActivity.reduce((best, c) => (c.lastActivityAt! > best.lastActivityAt! ? c : best))
}
