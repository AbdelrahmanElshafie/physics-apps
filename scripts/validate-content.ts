/**
 * Validates every syllabus, lesson and exercise file.
 *
 *   pnpm validate:content
 *
 * Content is hand-authored, so it will be malformed sometimes. This reports *every* problem in one
 * pass rather than dying on the first, because fixing a syllabus one Zod error per run is
 * miserable. Exits non-zero on error so it can gate CI later.
 */

import { findGraphIssues, parseTopicId, type TopicId } from '../src/core/domain'
import { FileSystemContentRepository } from '../src/adapters/content/fs-mdx'

const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`

const errors: string[] = []
const warnings: string[] = []

async function main(): Promise<void> {
  const content = new FileSystemContentRepository()

  const ids = await content.listSyllabusIds()
  if (ids.length === 0) {
    console.error(red('No syllabi found under content/syllabi/.'))
    process.exitCode = 1
    return
  }

  console.log(`\nValidating ${ids.length} syllabus folder(s)...\n`)

  for (const id of ids) {
    try {
      const syllabus = await content.getSyllabus(id)
      if (!syllabus) {
        errors.push(`${id}: syllabus.yaml could not be read.`)
        continue
      }
      console.log(
        `  ${green('ok')} ${syllabus.title} ${dim(`(${syllabus.topics.size} topics, ${syllabus.modules.size} modules)`)}`,
      )
    } catch (error) {
      errors.push(`${id}: ${(error as Error).message}`)
    }
  }

  // The graph spans every loaded syllabus, so cross-syllabus prerequisites are checked too.
  const allTopics = await content.allTopics()
  for (const issue of findGraphIssues(allTopics)) {
    if (issue.kind === 'cycle') errors.push(`Graph: ${issue.detail}`)
    else warnings.push(`Graph: ${issue.detail}`)
  }

  let lessons = 0
  let exerciseCount = 0
  const withoutLesson: TopicId[] = []

  for (const [topicId] of allTopics) {
    try {
      const lesson = await content.getLesson(topicId)
      if (lesson) lessons += 1
      else withoutLesson.push(topicId)

      const exercises = await content.getExercises(topicId)
      exerciseCount += exercises.length

      const seen = new Set<string>()
      for (const exercise of exercises) {
        if (seen.has(exercise.id)) {
          errors.push(`${topicId}: duplicate exercise id "${exercise.id}".`)
        }
        seen.add(exercise.id)
      }
    } catch (error) {
      errors.push(`${topicId}: ${(error as Error).message}`)
    }
  }

  // Check the lesson file naming matches what the repository will look for.
  for (const [topicId] of allTopics) {
    const { local } = parseTopicId(topicId)
    if (local.includes('/') || local.includes('\\')) {
      errors.push(`${topicId}: topic ids must not contain path separators.`)
    }
  }

  console.log(
    `\n  ${lessons} lesson(s), ${exerciseCount} exercise(s) across ${allTopics.size} topic(s).`,
  )
  // Unwritten lessons are the normal state of a 219-topic syllabus, not a defect.
  console.log(dim(`  ${withoutLesson.length} topic(s) have no lesson written yet.\n`))

  for (const warning of warnings) console.log(`  ${yellow('warn')} ${warning}`)
  for (const error of errors) console.log(`  ${red('error')} ${error}`)

  if (errors.length > 0) {
    console.log(red(`\n${errors.length} error(s).\n`))
    process.exitCode = 1
  } else {
    console.log(green(`\nContent is valid.${warnings.length > 0 ? ` (${warnings.length} warning(s))` : ''}\n`))
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
