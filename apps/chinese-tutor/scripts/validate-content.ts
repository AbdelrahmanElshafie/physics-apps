/**
 * Validates the syllabus, lessons and exercises.
 *
 *   pnpm validate:content
 *
 * No locale parity to check (this app is English-interface, single-subject), same schema and DAG
 * validation as the other two apps otherwise.
 */

import { findGraphIssues } from '@core/domain'
import { FileSystemContentRepository } from '../src/adapters/content/fs-mdx'

const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
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

  const allTopics = await content.allTopics()
  for (const issue of findGraphIssues(allTopics)) {
    if (issue.kind === 'cycle') errors.push(`Graph: ${issue.detail}`)
    else warnings.push(`Graph: ${issue.detail}`)
  }

  let lessons = 0
  let exerciseCount = 0
  const withoutLesson: string[] = []

  for (const [topicId] of allTopics) {
    try {
      const lesson = await content.getLesson(topicId)
      if (lesson) lessons += 1
      else withoutLesson.push(topicId)

      const exercises = await content.getExercises(topicId)
      exerciseCount += exercises.length

      const seen = new Set<string>()
      for (const exercise of exercises) {
        if (seen.has(exercise.id)) errors.push(`${topicId}: duplicate exercise id "${exercise.id}".`)
        seen.add(exercise.id)
      }
    } catch (error) {
      errors.push(`${topicId}: ${(error as Error).message}`)
    }
  }

  console.log(`\n  ${lessons} lesson(s), ${exerciseCount} exercise(s) across ${allTopics.size} topic(s).`)
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
