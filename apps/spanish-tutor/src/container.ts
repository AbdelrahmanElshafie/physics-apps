import { ulid } from 'ulid'

import { RulesAnswerChecker } from '@physics/checker'
import { FileSystemScratchpadRepository } from '@physics/scratchpad'
import { ClaudeCodeTutorTransport } from '@physics/tutor-bridge'
import { FileSystemReviewRepository, type ReviewRepository } from '@physics/review'
import type {
  AnswerChecker,
  ContentRepository,
  ProgressRepository,
  ReviewContentPort,
  ScratchpadRepository,
  TutorTransport,
} from '@core/ports'
import type { Clock, IdGenerator } from '@core/services'

import { FileSystemContentRepository } from '@adapters/content/fs-mdx'
import { FileSystemReviewContentRepository } from '@adapters/content/fs-review'
import { FileSystemProgressRepository } from '@adapters/progress/fs-events'

/**
 * Composition root — the only place that names a concrete adapter.
 *
 * Reuses the same tutor bridge and scratchpad adapters as the other apps in this workspace
 * (`@physics/tutor-bridge`, `@physics/scratchpad`) — the npm scope is a historical artifact of
 * which app existed first, not a claim that the code is physics-specific; see each package's own
 * README. Everything is rooted under this app's own `data/` directory so threads and pads never
 * mix with any sibling app's.
 */
interface Container {
  content: ContentRepository
  progress: ProgressRepository
  scratch: ScratchpadRepository
  tutor: TutorTransport
  checker: AnswerChecker
  review: ReviewRepository
  reviewContent: ReviewContentPort
  clock: Clock
  ids: IdGenerator
}

declare global {
  var __spanishTutorContainer: Container | undefined
}

function createTutorTransport(): TutorTransport {
  const configured = process.env.TUTOR_TRANSPORT ?? 'claude-code'

  switch (configured) {
    case 'claude-code':
      return new ClaudeCodeTutorTransport()
    default:
      throw new Error(`Unknown TUTOR_TRANSPORT "${configured}". Expected "claude-code".`)
  }
}

function build(): Container {
  return {
    content: new FileSystemContentRepository(),
    progress: new FileSystemProgressRepository(),
    scratch: new FileSystemScratchpadRepository(),
    tutor: createTutorTransport(),
    checker: new RulesAnswerChecker(),
    review: new FileSystemReviewRepository(),
    reviewContent: new FileSystemReviewContentRepository(),
    clock: { now: () => new Date() },
    ids: { next: () => ulid() },
  }
}

export const container: Container = globalThis.__spanishTutorContainer ?? build()
globalThis.__spanishTutorContainer = container
