import { z } from 'zod'

/**
 * A GRASP2018 MCDHF calculation, described as data.
 *
 * Every field here corresponds to an answer one of the GRASP programs asks for at its prompt. The
 * prompts were read from the GRASP2018 source rather than guessed, and the names below use the
 * program's own wording, so a learner can hold the spec and the terminal session side by side:
 *
 *   rcsfgenerate  core, reference configurations, active set, 2*J range, excitation level
 *   rmcdhf        levels per block, level weights, orbitals to vary, spectroscopic orbitals, cycles
 *   rci           transverse (Breit), vacuum polarisation, mass shifts, self-energy
 *
 * Modelling it as data rather than as a template string is what lets the same description drive a
 * generated script now and a job submitted to WSL later, and lets the lessons show a diff when one
 * parameter changes.
 */

/** Closed core offered by rcsfgenerate, in its own menu order. */
export const CORE_SHELLS = ['none', 'He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn'] as const
export type CoreShell = (typeof CORE_SHELLS)[number]

/** rcsfgenerate's core menu is numeric; this is the mapping it expects. */
export const CORE_CODE: Record<CoreShell, number> = {
  none: 0,
  He: 1,
  Ne: 2,
  Ar: 3,
  Kr: 4,
  Xe: 5,
  Rn: 6,
}

/** Which closed shells each core stands for — shown in lessons, not sent to GRASP. */
export const CORE_CONFIGURATION: Record<CoreShell, string> = {
  none: '',
  He: '1s2',
  Ne: '1s2 2s2 2p6',
  Ar: '1s2 2s2 2p6 3s2 3p6',
  Kr: '[Ar] 3d10 4s2 4p6',
  Xe: '[Kr] 4d10 5s2 5p6',
  Rn: '[Xe] 4f14 5d10 6s2 6p6',
}

export const nucleusSchema = z.object({
  element: z.string().min(1),
  /** Atomic number. */
  Z: z.number().int().positive(),
  /** Mass number. */
  A: z.number().int().positive(),
  /**
   * Mass of the neutral atom in amu. Zero models the nucleus as static (infinitely heavy), which
   * is the usual choice when mass-polarisation effects are not being studied.
   *
   * rnucleus asks for this between "revise these values?" and the nuclear spin. Omitting it
   * silently shifts every later answer up by one and the program dies on end-of-file.
   */
  atomicMass: z.number().nonnegative().default(0),
  /** Nuclear spin I. Zero gives a static, spinless nucleus — the usual choice for energy levels. */
  spin: z.number().nonnegative().default(0),
  magneticMoment: z.number().default(0),
  quadrupoleMoment: z.number().default(0),
})

export const parityBlockSchema = z.object({
  /** File stem used throughout the run: even.c, even.w, even.cm ... */
  id: z.string().regex(/^[a-z0-9_-]+$/),
  label: z.string().min(1),
  /**
   * Reference configurations in rcsfgenerate syntax, e.g. `2s(2,*)2p(2,*)`.
   * The `*` marks a subshell that excitations may leave.
   */
  reference: z.array(z.string().min(1)).min(1),
  /** 2*J range the block spans. Doubled because half-integer J must stay an integer here. */
  twoJMin: z.number().int().nonnegative(),
  twoJMax: z.number().int().nonnegative(),
  /**
   * How many J blocks rcsfgenerate will produce, and therefore how many level selections rmcdhf
   * and rci will each ask for.
   */
  blockCount: z.number().int().positive(),
  /** Levels carried into RCI per block, in GRASP's range syntax, e.g. `1-10`. */
  levels: z.string().min(1).default('1-10'),
})

export const activeSetSchema = z.object({
  /** Orbitals opened for excitation, e.g. ['3s','3p','3d']. Empty means the reference only. */
  orbitals: z.array(z.string().min(1)),
  /** 1 = singles, 2 = singles and doubles (what both papers use), 3 = up to triples. */
  excitations: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
})

export const rciOptionsSchema = z.object({
  /** "Include contribution of H (Transverse)?" — the Breit interaction. */
  transverse: z.boolean().default(true),
  /** "Modify all transverse photon frequencies?" — left off for ordinary structure work. */
  modifyFrequencies: z.boolean().default(false),
  /** QED: vacuum polarisation. */
  vacuumPolarisation: z.boolean().default(true),
  normalMassShift: z.boolean().default(true),
  specificMassShift: z.boolean().default(true),
  /** QED: self-energy, the larger of the two QED terms. */
  selfEnergy: z.boolean().default(true),
  /** Largest principal quantum number included in the self-energy estimate. */
  selfEnergyMaxN: z.number().int().positive().default(3),
})

export const graspSpecSchema = z.object({
  /** Short name for the run; used for the working directory and headers. */
  name: z.string().min(1),
  /** Human label such as "Mo XXXVI" or "C-like Mo". */
  ion: z.string().default(''),
  /** Electrons in the ion — a sanity check against the configurations. */
  electrons: z.number().int().positive(),
  nucleus: nucleusSchema,
  core: z.enum(CORE_SHELLS).default('He'),
  blocks: z.array(parityBlockSchema).min(1),
  activeSet: activeSetSchema,
  /** Orbitals varied in the SCF. `*` means all of them. */
  varyOrbitals: z.string().default('*'),
  /**
   * Spectroscopic orbitals: those required to keep the correct number of nodes, normally the ones
   * occupied in the reference configurations.
   */
  spectroscopicOrbitals: z.string().min(1),
  /** rmcdhf: 1 equal, 5 standard, 9 user. */
  levelWeights: z.enum(['equal', 'standard', 'user']).default('standard'),
  maxScfCycles: z.number().int().positive().default(100),
  rci: rciOptionsSchema,
  graspHome: z.string().default('$HOME/GRASP2018'),
  workDir: z.string().min(1),
})

export type Nucleus = z.infer<typeof nucleusSchema>
export type ParityBlock = z.infer<typeof parityBlockSchema>
export type ActiveSet = z.infer<typeof activeSetSchema>
export type RciOptions = z.infer<typeof rciOptionsSchema>
export type GraspSpec = z.infer<typeof graspSpecSchema>

export const LEVEL_WEIGHT_CODE: Record<GraspSpec['levelWeights'], number> = {
  equal: 1,
  standard: 5,
  user: 9,
}

/**
 * The active set written the way the papers write it: "n ≤ 6, l ≤ 3".
 * Returns null when no orbitals are opened, i.e. a multireference-only calculation.
 */
export function activeSetLabel(activeSet: ActiveSet): string | null {
  if (activeSet.orbitals.length === 0) return null

  const ORBITAL_L: Record<string, number> = { s: 0, p: 1, d: 2, f: 3, g: 4, h: 5 }
  let maxN = 0
  let maxL = 0

  for (const orbital of activeSet.orbitals) {
    const match = /^(\d+)([spdfgh])/.exec(orbital.trim())
    if (!match) continue
    maxN = Math.max(maxN, Number(match[1]))
    maxL = Math.max(maxL, ORBITAL_L[match[2]!] ?? 0)
  }

  return maxN === 0 ? null : `n <= ${maxN}, l <= ${maxL}`
}
