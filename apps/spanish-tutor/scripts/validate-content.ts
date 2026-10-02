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
import { FileSystemReviewContentRepository } from '../src/adapters/content/fs-review'

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

  try {
    const reviewContent = new FileSystemReviewContentRepository()
    const cards = await reviewContent.allDecks()
    const seenCardIds = new Set<string>()

    for (const card of cards) {
      if (seenCardIds.has(card.id)) errors.push(`review: duplicate card id "${card.id}".`)
      seenCardIds.add(card.id)

      if (!allTopics.has(card.topicId as never)) {
        errors.push(`review: card "${card.id}" has unknown topicId "${card.topicId}".`)
      }

      if (card.exerciseIds.length > 0) {
        const exercises = await content.getExercises(card.topicId as never)
        const exerciseIds = new Set(exercises.map((e) => e.id))
        for (const exerciseId of card.exerciseIds) {
          if (!exerciseIds.has(exerciseId)) {
            errors.push(`review: card "${card.id}" references unknown exercise "${exerciseId}".`)
          }
        }
      }
    }

    console.log(`  ${cards.length} review card(s) across ${new Set(cards.map((c) => c.topicId)).size} topic(s).\n`)
  } catch (error) {
    errors.push(`review: ${(error as Error).message}`)
  }

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
