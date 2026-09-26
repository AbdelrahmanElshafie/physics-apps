/**
 * Regenerates a plain-markdown handbook from the authored content.
 *
 *   pnpm export:handbook [--out <path>]
 *
 * This is the escape hatch. The lessons live as MDX with custom components, which is what makes
 * the app good — but it would be a bad trade if it meant the material could only ever be read
 * through a running dev server. This converts everything back to portable markdown, so the
 * original handbook stays a living artifact you can print, email or keep in a repo.
 *
 * It is a lossy export by nature: an interactive vector plot becomes a note describing it. That is
 * the honest outcome, and it is flagged inline rather than silently dropped.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import { FileSystemContentRepository } from '../src/adapters/content/fs-mdx'
import { groupBySet, parseTopicId, type Exercise } from '../src/core/domain'

const content = new FileSystemContentRepository()

/** Pulls the value of a JSX attribute written as `name={String.raw`...`}` or `name="..."`. */
function attr(tag: string, name: string): string | null {
  const raw = new RegExp(`${name}=\\{String\\.raw\`([\\s\\S]*?)\`\\}`).exec(tag)
  if (raw?.[1] !== undefined) return raw[1]

  const quoted = new RegExp(`${name}="([^"]*)"`).exec(tag)
  if (quoted?.[1] !== undefined) return quoted[1]

  const braced = new RegExp(`${name}=\\{'([^']*)'\\}`).exec(tag)
  return braced?.[1] ?? null
}

/** Evaluates a JS array literal from a JSX prop. The input is our own content, not user data. */
function arrayProp(tag: string, name: string): unknown[] | null {
  const match = new RegExp(`${name}=\\{(\\[[\\s\\S]*?\\])\\}\\s`).exec(`${tag} `)
  if (!match?.[1]) return null
  try {
    return JSON.parse(match[1].replace(/'/g, '"').replace(/,(\s*[\]}])/g, '$1')) as unknown[]
  } catch {
    return null
  }
}

function table(columns: string[], rows: string[][]): string {
  const head = `| ${columns.join(' | ')} |`
  const rule = `|${columns.map(() => '---').join('|')}|`
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n')
  return `${head}\n${rule}\n${body}`
}

function mdxToMarkdown(source: string): string {
  let out = source

  // Self-closing <Eq ... /> -> a display-math block.
  out = out.replace(/<Eq\b([\s\S]*?)\/>/g, (_full, inner: string) => {
    const latex = attr(inner, 'latex') ?? ''
    const label = attr(inner, 'label')
    return `${label ? `*${label}:*\n\n` : ''}$$\n${latex}\n$$`
  })

  // <Derivation> ... </Derivation> with <Step /> children -> a numbered list.
  out = out.replace(
    /<Derivation\b([^>]*)>([\s\S]*?)<\/Derivation>/g,
    (_full, head: string, body: string) => {
      const caption = attr(head, 'caption')
      const steps: string[] = []
      for (const match of body.matchAll(/<Step\b([\s\S]*?)\/>/g)) {
        const tag = match[1] ?? ''
        const latex = attr(tag, 'latex') ?? ''
        const why = attr(tag, 'why')
        steps.push(`${steps.length + 1}. $${latex}$${why ? `\n   *${why}*` : ''}`)
      }
      return `${caption ? `**${caption}**\n\n` : ''}${steps.join('\n')}`
    },
  )

  // <Compare columns={[...]} rows={[[...]]} /> -> a markdown table.
  out = out.replace(/<Compare\b([\s\S]*?)\/>/g, (_full, tag: string) => {
    const columns = arrayProp(tag, 'columns') as string[] | null
    const rows = arrayProp(tag, 'rows') as string[][] | null
    const caption = attr(tag, 'caption')
    if (!columns || !rows) return ''
    return `${caption ? `**${caption}**\n\n` : ''}${table(columns, rows)}`
  })

  // <Axioms items={[[latex, meaning], ...]} /> -> a two-column table.
  out = out.replace(/<Axioms\b([\s\S]*?)\/>/g, (_full, tag: string) => {
    const items = arrayProp(tag, 'items') as [string, string][] | null
    if (!items) return ''
    return table(
      ['Rule', 'Meaning'],
      items.map(([latex, meaning]) => [`$${latex}$`, meaning]),
    )
  })

  // Interactive widgets cannot survive the trip; say so rather than dropping them.
  out = out.replace(/<VectorPlot\b([\s\S]*?)\/>/g, (_full, tag: string) => {
    const caption = attr(tag, 'caption')
    return `> **[Interactive figure]** ${caption ?? 'A draggable vector plot appears here in the app.'}`
  })

  // Block components that wrap prose.
  out = out.replace(
    /<Callout\b([^>]*)>([\s\S]*?)<\/Callout>/g,
    (_full, head: string, body: string) => {
      const kind = attr(head, 'kind') ?? 'note'
      const heading =
        { why: 'Why this matters', note: 'Note', warning: 'Careful', forward: 'Where this leads' }[
          kind
        ] ?? 'Note'
      const quoted = body
        .trim()
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
      return `> **${heading}**\n>\n${quoted}`
    },
  )

  out = out.replace(
    /<Definition\b([^>]*)>([\s\S]*?)<\/Definition>/g,
    (_full, head: string, body: string) => `**${attr(head, 'term') ?? 'Definition'}.** ${body.trim()}`,
  )

  // Inline wrappers: keep the text, drop the element.
  out = out.replace(/<Symbol\b[^>]*>([\s\S]*?)<\/Symbol>/g, '$1')
  out = out.replace(/<M>([\s\S]*?)<\/M>/g, '$$$1$$')

  // Tidy up the blank lines the substitutions leave behind.
  return out.replace(/\n{3,}/g, '\n\n').trim()
}

function exercisesToMarkdown(exercises: Exercise[]): string {
  const sections: string[] = ['## Exercises\n']

  for (const group of groupBySet(exercises)) {
    sections.push(`### Set ${group.set}\n`)
    for (const exercise of group.exercises) {
      const label = exercise.label ?? exercise.id
      sections.push(`**${label}.** ${exercise.prompt}`)
      if (exercise.given) sections.push(`\n$$\n${exercise.given}\n$$`)
      if (exercise.explain.required) sections.push('\n*Explain your reasoning.*')
      sections.push('')
    }
  }

  sections.push('---\n', '## Solutions\n')
  for (const group of groupBySet(exercises)) {
    sections.push(`### Set ${group.set}\n`)
    for (const exercise of group.exercises) {
      sections.push(`**${exercise.label ?? exercise.id}.** ${exercise.solution.trim()}\n`)
    }
  }

  return sections.join('\n')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const outIndex = args.indexOf('--out')
  const outPath =
    outIndex >= 0 && args[outIndex + 1]
      ? args[outIndex + 1]!
      : path.join(process.cwd(), 'exports', 'Nuclear_Physics_Handbook.generated.md')

  const syllabi = await content.listSyllabi()
  const parts: string[] = []
  let lessonCount = 0

  for (const syllabus of syllabi) {
    parts.push(`# ${syllabus.title}`)
    if (syllabus.subtitle) parts.push(`## ${syllabus.subtitle}\n`)
    parts.push(`*Generated from content/syllabi by \`pnpm export:handbook\`.*`)
    parts.push(`*Interactive figures are described rather than drawn — open the app for those.*\n`)
    parts.push('---\n')

    for (const phase of syllabus.phases) {
      const phaseTopics = phase.moduleIds.flatMap(
        (id) => syllabus.modules.get(id)?.topicIds ?? [],
      )
      // Skip a phase entirely if nothing in it has been written yet.
      const written = await Promise.all(phaseTopics.map((t) => content.getLesson(t)))
      if (written.every((l) => l === null)) continue

      parts.push(`# ${phase.title}\n`)

      for (const moduleId of phase.moduleIds) {
        const mod = syllabus.modules.get(moduleId)
        if (!mod) continue

        for (const topicId of mod.topicIds) {
          const [lesson, exercises] = await Promise.all([
            content.getLesson(topicId),
            content.getExercises(topicId),
          ])
          if (!lesson && exercises.length === 0) continue

          const { local } = parseTopicId(topicId)
          const topic = syllabus.topics.get(topicId)

          parts.push(`\n# ${topic?.title ?? local}\n`)
          if (lesson?.frontmatter.summary) parts.push(`*${lesson.frontmatter.summary}*\n`)

          if (lesson) {
            lessonCount += 1
            parts.push(mdxToMarkdown(lesson.body))
          }
          if (exercises.length > 0) {
            parts.push('\n---\n')
            parts.push(exercisesToMarkdown(exercises))
          }
          parts.push('\n---\n')
        }
      }
    }
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, `${parts.join('\n')}\n`, 'utf8')

  const bytes = (await fs.stat(outPath)).size
  console.log(
    `\n  Exported ${lessonCount} lesson(s) to ${path.relative(process.cwd(), outPath)} (${(bytes / 1024).toFixed(1)} KB)\n`,
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
