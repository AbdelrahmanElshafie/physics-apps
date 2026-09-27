import { ulid } from 'ulid'

import { RulesAnswerChecker } from '@physics/checker'
import { FileSystemScratchpadRepository } from '@physics/scratchpad'
import { ClaudeCodeTutorTransport } from '@physics/tutor-bridge'
import type {
  AnswerChecker,
  ContentRepository,
  ProgressRepository,
  ScratchpadRepository,
  TutorTransport,
} from '@core/ports'
import type { Clock, IdGenerator } from '@core/services'

import { FileSystemContentRepository } from '@adapters/content/fs-mdx'
import { FileSystemProgressRepository } from '@adapters/progress/fs-events'

/**
 * Composition root — the only place that names a concrete adapter.
 *
 * No locale to thread through, unlike physics-instructor — that is the one real simplification
 * left here. The tutor bridge and scratchpad now run on the same adapters physics-instructor uses
 * (`@physics/tutor-bridge`, `@physics/scratchpad`), each rooted under this app's own `data/`
 * directory so the two apps' bridges and pads never mix.
 */
interface Container {
  content: ContentRepository
  progress: ProgressRepository
  scratch: ScratchpadRepository
  tutor: TutorTransport
  checker: AnswerChecker
  clock: Clock
  ids: IdGenerator
}

declare global {
  var __physicsEgContainer: Container | undefined
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
    clock: { now: () => new Date() },
    ids: { next: () => ulid() },
  }
}

export const container: Container = globalThis.__physicsEgContainer ?? build()
globalThis.__physicsEgContainer = container
