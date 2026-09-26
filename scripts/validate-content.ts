/**
 * Validates every syllabus, lesson and exercise file.
 *
 *   pnpm validate:content
 *
 * Content is hand-authored, so it will be malformed sometimes. This reports *every* problem in one
 * pass rather than dying on the first, because fixing a syllabus one Zod error per run is
 * miserable. Exits non-zero on error so it can gate CI later.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'

import {
  LOCALES,
  DEFAULT_LOCALE,
  findGraphIssues,
  localeSuffix,
  parseTopicId,
  type TopicId,
} from '../src/core/domain'
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

  // Translations must agree with the English original on ids, kinds and checks.
  await checkLocaleParity()
  await checkSyllabusParity()

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

/**
 * Translations must keep the same exercise ids, kinds and checks as the English original.
 *
 * Progress is recorded against the id, so a renamed one would hide an answer already submitted in
 * the other language. A differing `check` is worse: the same question would be marked correct in
 * one language and wrong in the other.
 */
async function checkLocaleParity(): Promise<void> {
  const root = path.join(process.cwd(), 'content', 'syllabi')

  let syllabusDirs: string[]
  try {
    syllabusDirs = (await fs.readdir(root, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  } catch {
    return
  }

  for (const syllabus of syllabusDirs) {
    const exercisesDir = path.join(root, syllabus, 'exercises')
    let names: string[]
    try {
      names = await fs.readdir(exercisesDir)
    } catch {
      continue
    }

    const englishFiles = names.filter(
      (n) => n.endsWith('.yaml') && !LOCALES.some((l) => l !== DEFAULT_LOCALE && n.endsWith(`${localeSuffix(l)}.yaml`)),
    )

    for (const englishName of englishFiles) {
      const english = parseExercises(await fs.readFile(path.join(exercisesDir, englishName), 'utf8'))

      for (const locale of LOCALES) {
        if (locale === DEFAULT_LOCALE) continue

        const translatedName = englishName.replace(/\.yaml$/, `${localeSuffix(locale)}.yaml`)
        let raw: string
        try {
          raw = await fs.readFile(path.join(exercisesDir, translatedName), 'utf8')
        } catch {
          continue // No translation is fine; it falls back to English.
        }

        const translated = parseExercises(raw)
        const stem = englishName.replace(/\.yaml$/, '')

        for (const id of Object.keys(english)) {
          if (!(id in translated)) {
            errors.push(`${stem} [${locale}]: missing exercise "${id}".`)
            continue
          }
          if (JSON.stringify(english[id]!.check) !== JSON.stringify(translated[id]!.check)) {
            errors.push(
              `${stem} [${locale}]: exercise "${id}" has a different check than the English version.`,
            )
          }
          if (english[id]!.kind !== translated[id]!.kind) {
            errors.push(`${stem} [${locale}]: exercise "${id}" has a different kind.`)
          }
        }

        for (const id of Object.keys(translated)) {
          if (!(id in english)) {
            errors.push(`${stem} [${locale}]: exercise "${id}" does not exist in English.`)
          }
        }
      }
    }
  }
}

/**
 * The syllabus tree must have identical ids in every locale.
 *
 * Only the titles are translated. A topic present in one tree and missing from another would mean
 * progress recorded against it simply vanishes when the reader switches language.
 */
async function checkSyllabusParity(): Promise<void> {
  const root = path.join(process.cwd(), 'content', 'syllabi')

  let syllabusDirs: string[]
  try {
    syllabusDirs = (await fs.readdir(root, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  } catch {
    return
  }

  for (const syllabus of syllabusDirs) {
    let base: string
    try {
      base = await fs.readFile(path.join(root, syllabus, 'syllabus.yaml'), 'utf8')
    } catch {
      continue
    }
    const englishIds = treeIds(base)

    for (const locale of LOCALES) {
      if (locale === DEFAULT_LOCALE) continue

      let raw: string
      try {
        raw = await fs.readFile(
          path.join(root, syllabus, `syllabus${localeSuffix(locale)}.yaml`),
          'utf8',
        )
      } catch {
        continue // No translated tree is fine; it falls back to English.
      }

      const translatedIds = treeIds(raw)
      const missing = [...englishIds].filter((id) => !translatedIds.has(id))
      const extra = [...translatedIds].filter((id) => !englishIds.has(id))

      if (missing.length > 0) {
        errors.push(
          `${syllabus} [${locale}]: syllabus tree is missing ${missing.length} id(s), e.g. ${missing.slice(0, 3).join(', ')}.`,
        )
      }
      if (extra.length > 0) {
        errors.push(
          `${syllabus} [${locale}]: syllabus tree has ${extra.length} id(s) not in English, e.g. ${extra.slice(0, 3).join(', ')}.`,
        )
      }
    }
  }
}

/** Every phase, module and topic id in a syllabus file. */
function treeIds(raw: string): Set<string> {
  const tree = parseYaml(raw) as {
    phases?: { id: string; modules?: { id: string; topics?: { id: string }[] }[] }[]
  }

  const ids = new Set<string>()
  for (const phase of tree.phases ?? []) {
    ids.add(`phase:${phase.id}`)
    for (const mod of phase.modules ?? []) {
      ids.add(`module:${mod.id}`)
      for (const topic of mod.topics ?? []) ids.add(`topic:${topic.id}`)
    }
  }
  return ids
}

function parseExercises(raw: string): Record<string, { check: unknown; kind: unknown }> {
  const parsed = parseYaml(raw) as { exercises?: { id: string; check: unknown; kind: unknown }[] }
  return Object.fromEntries(
    (parsed.exercises ?? []).map((e) => [e.id, { check: e.check, kind: e.kind }]),
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
