import { ulid } from 'ulid'

import type {
  AnswerChecker,
  ProgressRepository,
  ScratchpadRepository,
  TutorTransport,
} from '@core/ports'
import type { Clock, IdGenerator } from '@core/services'

import { CompositeAnswerChecker } from '@adapters/checker/composite'
import { RulesAnswerChecker } from '@adapters/checker/rules'
import { SympyAnswerChecker } from '@adapters/checker/sympy'
import { FileSystemContentRepository } from '@adapters/content/fs-mdx'
import { FileSystemProgressRepository } from '@adapters/progress/fs-events'
import { FileSystemScratchpadRepository } from '@adapters/scratch/fs-json'
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
  readonly scratch: ScratchpadRepository
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

/**
 * Rules first, SymPy second.
 *
 * The rule-based checker settles most answers synchronously; the symbolic worker handles what is
 * left (roots, unevaluated arithmetic, factored forms). If Python or SymPy is missing the symbolic
 * stage simply reports `unverified`, so the app degrades to tutor review rather than failing.
 * Set SYMBOLIC_CHECKING=off to skip it entirely.
 */
function createAnswerChecker(): AnswerChecker {
  const rules = new RulesAnswerChecker()
  if (process.env.SYMBOLIC_CHECKING === 'off') return rules
  return new CompositeAnswerChecker(rules, new SympyAnswerChecker())
}

function build(): Container {
  return {
    content: new FileSystemContentRepository(),
    progress: new FileSystemProgressRepository(),
    scratch: new FileSystemScratchpadRepository(),
    tutor: createTutorTransport(),
    checker: createAnswerChecker(),
    clock: systemClock,
    ids: ulidIds,
  }
}

const globalRef = globalThis as typeof globalThis & { __physicsContainer?: Container }

/**
 * Every field the container must have.
 *
 * Typed as a total record so adding a dependency to `Container` without listing it here is a
 * compile error. That matters because the instance is cached across hot reloads: adding a field
 * would otherwise leave the dev server serving a stale container missing it, which surfaces as a
 * baffling "cannot read properties of undefined" far from the actual change.
 */
const REQUIRED_KEYS: Record<keyof Container, true> = {
  content: true,
  progress: true,
  scratch: true,
  tutor: true,
  checker: true,
  clock: true,
  ids: true,
}

function isComplete(candidate: Container): boolean {
  return Object.keys(REQUIRED_KEYS).every((key) => key in candidate)
}

export function container(): Container {
  const cached = globalRef.__physicsContainer
  if (cached && isComplete(cached)) return cached

  globalRef.__physicsContainer = build()
  return globalRef.__physicsContainer
}

/** Tests build their own container from fakes; this only resets the cached production one. */
export function resetContainer(): void {
  delete globalRef.__physicsContainer
}
