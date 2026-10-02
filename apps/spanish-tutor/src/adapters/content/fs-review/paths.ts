import path from 'node:path'

import { CONTENT_ROOT } from '../fs-mdx/paths'

export { CONTENT_ROOT }
export const reviewDir = (syllabusId: string) => path.join(CONTENT_ROOT, syllabusId, 'review')
export const reviewFile = (syllabusId: string, localTopicId: string) =>
  path.join(reviewDir(syllabusId), `${localTopicId}.yaml`)
