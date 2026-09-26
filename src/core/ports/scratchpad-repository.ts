import type { Scratchpad, ScratchpadSummary } from '../domain/scratchpad'

/**
 * Storage for scratchpads.
 *
 * Separate from `ProgressRepository` on purpose: progress is an append-only log of things that
 * happened, whereas a scratchpad is a document that is edited in place. Forcing a mutable draft
 * through an event log would bloat it with every keystroke-save and make the history meaningless.
 */
export interface ScratchpadRepository {
  list(): Promise<ScratchpadSummary[]>
  get(id: string): Promise<Scratchpad | null>
  save(pad: Scratchpad): Promise<void>
  remove(id: string): Promise<void>
}
