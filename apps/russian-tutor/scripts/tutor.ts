/**
 * The tutor's terminal.
 *
 *   pnpm tutor                        list questions waiting for a reply
 *   pnpm tutor <n>                    show question n in full, with its context
 *   pnpm tutor:reply <n> "answer"     answer question n
 *   pnpm tutor:reply <n> --editor     open a scratch file, reply with whatever you write
 *   pnpm tutor grade <n> <verdict> "feedback"
 *                                     grade the attempt behind question n
 *                                     verdict: correct | partial | incorrect
 *   pnpm tutor profile                 what they know, where they're weak, full mistake history
 *
 * This is the half of the bridge the tutor lives in. It exists so answering a question is one
 * command rather than hand-authoring JSON into a hashed directory — the workflow has to be
 * frictionless or it will not get used.
 *
 * `profile` exists because the open-ended chat (the side panel, threaded on `general`) carries no
 * exercise context the way a graded question does — a student asking "can you explain X" there
 * gives me nothing about their actual level unless I go look. `list` prints a one-line summary for
 * the same reason: a glance at every session, not just when something feels worth digging into.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { ulid } from 'ulid'

import { ClaudeCodeTutorTransport, type BridgeMessage } from '@physics/tutor-bridge'
import { FileSystemContentRepository } from '../src/adapters/content/fs-mdx'
import { FileSystemProgressRepository } from '../src/adapters/progress/fs-events'
import { recordGrade } from '../src/core/services/submit-attempt'
import { topicMastery, type TopicId } from '../src/core/domain'

const transport = new ClaudeCodeTutorTransport()
const content = new FileSystemContentRepository()
const progress = new FileSystemProgressRepository()

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`

async function pendingList(): Promise<{ request: BridgeMessage; dir: string }[]> {
  return transport.pending()
}

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/** A one-line status line — context for every session, not just when something looks worth digging into. */
async function summaryLine(): Promise<string> {
  const state = await progress.state()
  const topicsViewed = [...state.topics.values()].filter((t) => t.viewed).length

  let attempted = 0
  let correct = 0
  let mistakes = 0
  for (const topic of state.topics.values()) {
    for (const ex of topic.exercises.values()) {
      attempted += 1
      const settled = ex.tutorVerdict ?? (ex.autoVerdict === 'correct' ? 'correct' : undefined)
      if (settled === 'correct') correct += 1
      else if (settled === 'incorrect') mistakes += 1
    }
  }

  if (attempted === 0) return dim(`${topicsViewed} topic(s) viewed, no exercises attempted yet.`)
  return dim(
    `${topicsViewed} topic(s) viewed · ${attempted} exercise(s) attempted, ${correct} correct, ${mistakes} mistake(s). ${bold('pnpm tutor profile')}${dim(' for the full picture.')}`,
  )
}

async function list(): Promise<void> {
  const pending = await pendingList()
  console.log(`\n  ${await summaryLine()}`)

  if (pending.length === 0) {
    console.log(green('\n  Nothing waiting. All questions answered.\n'))
    return
  }

  console.log(bold(`\n  ${pending.length} question${pending.length === 1 ? '' : 's'} waiting\n`))

  pending.forEach(({ request }, index) => {
    const context = request.context ?? {}
    const scope = context.exerciseId
      ? `exercise ${context.exerciseId}`
      : (context.topicId ?? request.threadId)

    const firstLine = request.body.split('\n')[0] ?? ''
    const preview = firstLine.length > 74 ? `${firstLine.slice(0, 74)}...` : firstLine

    console.log(`  ${cyan(`[${index + 1}]`)} ${preview}`)
    console.log(`      ${dim(`${scope} · ${relativeTime(request.ts)}`)}`)
    if (context.draftAnswer) {
      console.log(`      ${dim(`their answer: ${context.draftAnswer}`)}`)
    }
    console.log()
  })

  console.log(dim('  pnpm tutor <n>                    read one in full'))
  console.log(dim('  pnpm tutor:reply <n> "answer"     reply'))
  console.log(dim('  pnpm tutor grade <n> correct "…"  grade the attempt\n'))
}

/**
 * The full picture: every topic touched, mastery, and every exercise currently sitting on a
 * non-correct verdict — the actual answer to "what are they weak at, and where." This is what
 * makes a reply in the open-ended chat (threaded on `general`, carrying no exercise context of
 * its own) informed rather than generic.
 */
async function profile(): Promise<void> {
  const state = await progress.state()
  const counts = await content.exerciseCounts()
  const syllabi = await content.listSyllabi()
  const titles = new Map<string, string>()
  for (const syllabus of syllabi) {
    for (const [id, topic] of syllabus.topics) titles.set(String(id), topic.title)
  }

  const touched = [...state.topics.entries()].filter(([, t]) => t.viewed || t.exercises.size > 0)

  if (touched.length === 0) {
    console.log(dim('\n  No activity yet — nothing has been viewed or attempted.\n'))
    return
  }

  console.log(bold('\n  Progress\n'))

  const mistakes: { topicId: string; exerciseId: string; answer?: string; verdict: string }[] = []

  for (const [topicId, topic] of touched.sort((a, b) => (a[1].lastActivityAt ?? '').localeCompare(b[1].lastActivityAt ?? ''))) {
    const exerciseCount = counts.get(topicId) ?? 0
    const mastery = Math.round(topicMastery(topic, exerciseCount) * 100)
    const title = titles.get(String(topicId)) ?? String(topicId)

    console.log(`  ${title} ${dim(`(${mastery}% mastery, ${topic.exercises.size}/${exerciseCount || '?'} exercises attempted)`)}`)

    for (const ex of topic.exercises.values()) {
      const settled = ex.tutorVerdict ?? (ex.autoVerdict === 'correct' ? 'correct' : ex.autoVerdict)
      if (settled === 'correct') continue
      mistakes.push({
        topicId: String(topicId),
        exerciseId: ex.exerciseId,
        ...(ex.lastAnswer !== undefined ? { answer: ex.lastAnswer } : {}),
        verdict: settled ?? 'unverified',
      })
    }
  }

  if (mistakes.length > 0) {
    console.log(yellow(`\n  ${mistakes.length} exercise(s) not yet settled correct:\n`))
    for (const m of mistakes) {
      console.log(`  ${cyan(`${m.topicId} / ${m.exerciseId}`)} ${dim(`— ${m.verdict}`)}${m.answer ? dim(`, answered "${m.answer}"`) : ''}`)
    }
    console.log()
  } else {
    console.log(green('\n  Nothing outstanding — every attempted exercise settled correct.\n'))
  }
}

async function show(index: number): Promise<void> {
  const pending = await pendingList()
  const entry = pending[index - 1]
  if (!entry) {
    console.error(`No pending question [${index}]. There are ${pending.length}.`)
    process.exitCode = 1
    return
  }

  const { request } = entry
  const context = request.context ?? {}

  console.log(bold(`\n  Question [${index}]`))
  console.log(dim(`  thread ${request.threadId}`))
  console.log(dim(`  asked  ${relativeTime(request.ts)}\n`))

  if (context.topicId) {
    // Pull the exercise so the tutor sees the question, the expected answer and the student's
    // attempt together — grading blind from the message body alone loses the point.
    const exercises = await content.getExercises(context.topicId as TopicId)
    const exercise = exercises.find((e) => e.id === context.exerciseId)
    if (exercise) {
      console.log(yellow('  Exercise'))
      console.log(`  ${exercise.label ?? exercise.id}: ${exercise.prompt}`)
      console.log(dim(`  expected: ${JSON.stringify(exercise.check)}`))
      console.log(dim(`  solution: ${exercise.solution.replace(/\s+/g, ' ').slice(0, 200)}\n`))
    }
  }

  console.log(yellow('  They wrote'))
  console.log(
    request.body
      .split('\n')
      .map((l) => `  ${l}`)
      .join('\n'),
  )
  console.log()
  console.log(dim(`  pnpm tutor:reply ${index} "your answer"\n`))
}

/** Opens $EDITOR on a scratch file and returns what was written. */
async function composeInEditor(seed: string): Promise<string | null> {
  const editor = process.env.VISUAL ?? process.env.EDITOR
  if (!editor) {
    console.error('No $EDITOR or $VISUAL set. Pass the reply as an argument instead.')
    return null
  }

  const file = path.join(os.tmpdir(), `tutor-reply-${ulid()}.md`)
  await fs.writeFile(file, seed, 'utf8')

  const code = await new Promise<number>((resolve) => {
    const child = spawn(editor, [file], { stdio: 'inherit', shell: true })
    child.on('exit', (exitCode) => resolve(exitCode ?? 1))
  })

  if (code !== 0) {
    await fs.rm(file, { force: true })
    return null
  }

  const written = await fs.readFile(file, 'utf8')
  await fs.rm(file, { force: true })

  // Strip comment lines so the seed instructions never reach the learner.
  const body = written
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n')
    .trim()

  return body.length > 0 ? body : null
}

async function reply(index: number, rest: string[]): Promise<void> {
  const pending = await pendingList()
  const entry = pending[index - 1]
  if (!entry) {
    console.error(`No pending question [${index}]. There are ${pending.length}.`)
    process.exitCode = 1
    return
  }

  let body: string | null
  if (rest[0] === '--editor' || rest.length === 0) {
    body = await composeInEditor(
      `# Replying to: ${entry.request.body.split('\n')[0]}\n# Lines starting with # are removed.\n\n`,
    )
  } else {
    body = rest.join(' ')
  }

  if (!body) {
    console.error('Empty reply — nothing sent.')
    process.exitCode = 1
    return
  }

  await transport.reply({
    threadId: entry.request.threadId,
    answers: entry.request.id,
    body,
  })

  console.log(green(`\n  Replied to [${index}]. It is on their screen already.\n`))
}

async function grade(index: number, verdict: string, rest: string[]): Promise<void> {
  const valid = ['correct', 'partial', 'incorrect'] as const
  if (!valid.includes(verdict as (typeof valid)[number])) {
    console.error(`Verdict must be one of: ${valid.join(', ')}`)
    process.exitCode = 1
    return
  }

  const pending = await pendingList()
  const entry = pending[index - 1]
  if (!entry) {
    console.error(`No pending question [${index}].`)
    process.exitCode = 1
    return
  }

  const context = entry.request.context ?? {}
  if (!context.topicId || !context.exerciseId) {
    console.error('That question is not attached to an exercise, so there is nothing to grade.')
    console.error('Use `pnpm tutor:reply` to answer it instead.')
    process.exitCode = 1
    return
  }

  const feedback = rest.join(' ') || 'Reviewed.'

  // Find the attempt this question refers to, so the grade attaches to the right submission.
  const events = await progress.read()
  const attempt = [...events]
    .reverse()
    .find(
      (e) =>
        e.type === 'attempt.submitted' &&
        e.topicId === context.topicId &&
        e.exerciseId === context.exerciseId,
    )

  if (!attempt || attempt.type !== 'attempt.submitted') {
    console.error('No submitted attempt found for that exercise.')
    process.exitCode = 1
    return
  }

  await recordGrade(
    { progress, clock: { now: () => new Date() }, ids: { next: () => ulid() } },
    {
      topicId: context.topicId as TopicId,
      exerciseId: context.exerciseId,
      attemptId: attempt.attemptId,
      verdict: verdict as 'correct' | 'partial' | 'incorrect',
      feedback,
      gradedBy: 'tutor',
    },
  )

  // Grading answers the question too — otherwise it sits in the queue forever.
  await transport.reply({
    threadId: entry.request.threadId,
    answers: entry.request.id,
    body: `${verdict === 'correct' ? 'Correct.' : verdict === 'partial' ? 'Partly right.' : 'Not quite.'}\n\n${feedback}`,
  })

  console.log(green(`\n  Graded ${context.exerciseId} as ${verdict}.\n`))
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2)

  if (!command) return list()

  if (command === 'reply') {
    const index = Number(args[0])
    if (!Number.isInteger(index)) {
      console.error('Usage: pnpm tutor:reply <n> "your answer"')
      process.exitCode = 1
      return
    }
    return reply(index, args.slice(1))
  }

  if (command === 'profile') return profile()

  if (command === 'grade') {
    const index = Number(args[0])
    if (!Number.isInteger(index) || !args[1]) {
      console.error('Usage: pnpm tutor grade <n> <correct|partial|incorrect> "feedback"')
      process.exitCode = 1
      return
    }
    return grade(index, args[1], args.slice(2))
  }

  const index = Number(command)
  if (Number.isInteger(index)) return show(index)

  console.error(`Unknown command "${command}".`)
  process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
