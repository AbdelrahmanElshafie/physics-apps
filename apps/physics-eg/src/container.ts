import { ulid } from 'ulid'

import { RulesAnswerChecker } from '@physics/checker'
import type { AnswerChecker, ContentRepository, ProgressRepository } from '@core/ports'
import type { Clock, IdGenerator } from '@core/services'

import { FileSystemContentRepository } from '@adapters/content/fs-mdx'
import { FileSystemProgressRepository } from '@adapters/progress/fs-events'

/**
 * Composition root — the only place that names a concrete adapter.
 *
 * Simpler than physics-instructor's on purpose: no tutor transport yet (no Claude Code bridge is
 * wired up here — an exercise either checks itself or sits `awaitingReview` in the event log for a
 * human to read later), and no locale to thread through. Both are additive later.
 */
interface Container {
  content: ContentRepository
  progress: ProgressRepository
  checker: AnswerChecker
  clock: Clock
  ids: IdGenerator
}

declare global {
  var __physicsEgContainer: Container | undefined
}

function build(): Container {
  return {
    content: new FileSystemContentRepository(),
    progress: new FileSystemProgressRepository(),
    checker: new RulesAnswerChecker(),
    clock: { now: () => new Date() },
    ids: { next: () => ulid() },
  }
}

export const container: Container = globalThis.__physicsEgContainer ?? build()
globalThis.__physicsEgContainer = container
