import { ulid } from 'ulid'

import type { AnswerChecker, ProgressRepository, TutorTransport } from '@core/ports'
import type { Clock, IdGenerator } from '@core/services'

import { RulesAnswerChecker } from '@adapters/checker/rules'
import { FileSystemContentRepository } from '@adapters/content/fs-mdx'
import { FileSystemProgressRepository } from '@adapters/progress/fs-events'
import { ClaudeCodeTutorTransport } from '@adapters/tutor/claude-code'

/**
 * Composition root — the one place adapters are chosen.
 *
 * Everything above this file depends only on the ports in `src/core/ports`, so switching the tutor
 * from the Claude Code bridge to the Anthropic API (M3) is a branch here and nothing else. That is
 * the property the whole layout exists to buy; keep this file the only place that knows which
 * implementation is live.
 *
 * Instances are cached per process. The dev server hot-reloads modules, so the cache hangs off
 * globalThis to avoid re-reading content on every request.
 */

export interface Container {
  readonly content: FileSystemContentRepository
  readonly progress: ProgressRepository
  readonly tutor: TutorTransport
  readonly checker: AnswerChecker
  readonly clock: Clock
  readonly ids: IdGenerator
}

const systemClock: Clock = { now: () => new Date() }
const ulidIds: IdGenerator = { next: () => ulid() }

function createTutorTransport(): TutorTransport {
  const configured = process.env.TUTOR_TRANSPORT ?? 'claude-code'

  switch (configured) {
    case 'claude-code':
      return new ClaudeCodeTutorTransport()
    case 'anthropic':
      // M3. Deliberately a hard failure rather than a silent downgrade: if the environment asks
      // for the API tutor, quietly answering through the file bridge would be a confusing lie.
      throw new Error(
        'TUTOR_TRANSPORT=anthropic is not implemented yet (milestone M3). Use "claude-code" for now.',
      )
    default:
      throw new Error(
        `Unknown TUTOR_TRANSPORT "${configured}". Expected "claude-code" or "anthropic".`,
      )
  }
}

function build(): Container {
  return {
    content: new FileSystemContentRepository(),
    progress: new FileSystemProgressRepository(),
    tutor: createTutorTransport(),
    checker: new RulesAnswerChecker(),
    clock: systemClock,
    ids: ulidIds,
  }
}

const globalRef = globalThis as typeof globalThis & { __physicsContainer?: Container }

export function container(): Container {
  globalRef.__physicsContainer ??= build()
  return globalRef.__physicsContainer
}

/** Tests build their own container from fakes; this only resets the cached production one. */
export function resetContainer(): void {
  delete globalRef.__physicsContainer
}
