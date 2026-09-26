import path from 'node:path'

/** Content lives outside src/ so it can be edited without touching code. */
export const CONTENT_ROOT = path.join(process.cwd(), 'content', 'syllabi')

export const syllabusDir = (id: string) => path.join(CONTENT_ROOT, id)
export const syllabusFile = (id: string) => path.join(syllabusDir(id), 'syllabus.yaml')
export const glossaryFile = (id: string) => path.join(syllabusDir(id), 'glossary.yaml')
export const lessonFile = (syllabusId: string, localTopicId: string) =>
  path.join(syllabusDir(syllabusId), 'lessons', `${localTopicId}.mdx`)
export const exerciseFile = (syllabusId: string, localTopicId: string) =>
  path.join(syllabusDir(syllabusId), 'exercises', `${localTopicId}.yaml`)
