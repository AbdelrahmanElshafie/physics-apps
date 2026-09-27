/**
 * Re-exported from @physics/core — this app's scratchpad shape is identical to physics-eg's, and
 * `@physics/scratchpad`'s `checkWorking`/`FileSystemScratchpadRepository` are typed against the
 * package's `Scratchpad`/`ScratchStep`, not a local lookalike. Kept at this path so nothing else
 * in `src/core/domain` needs to change.
 */
export {
  type ScratchStep,
  type Scratchpad,
  type ScratchpadSummary,
  scratchStepSchema,
  scratchpadSchema,
  summariseScratchpad,
  formatWorking,
} from '@physics/core/domain'
