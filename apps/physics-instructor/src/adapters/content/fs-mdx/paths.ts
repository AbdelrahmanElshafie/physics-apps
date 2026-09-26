import path from 'node:path'

/** Content lives outside src/ so it can be edited without touching code. */
export const CONTENT_ROOT = path.join(process.cwd(), 'content', 'syllabi')
export const DATA_ROOT = path.join(process.cwd(), 'data')

export const syllabusDir = (id: string) => path.join(CONTENT_ROOT, id)
export const syllabusFile = (id: string, suffix = '') =>
  path.join(syllabusDir(id), `syllabus${suffix}.yaml`)
export const glossaryFile = (id: string) => path.join(syllabusDir(id), 'glossary.yaml')
/**
 * Locale-suffixed content paths. English is the unsuffixed base file, so the original content
 * keeps working and a translation is simply a sibling: `m1.1-hilbert-spaces.ar.mdx`.
 */
export const lessonFile = (syllabusId: string, localTopicId: string, suffix = '') =>
  path.join(syllabusDir(syllabusId), 'lessons', `${localTopicId}${suffix}.mdx`)
export const exerciseFile = (syllabusId: string, localTopicId: string, suffix = '') =>
  path.join(syllabusDir(syllabusId), 'exercises', `${localTopicId}${suffix}.yaml`)
