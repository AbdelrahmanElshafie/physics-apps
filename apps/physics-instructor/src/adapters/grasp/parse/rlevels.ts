/**
 * Parser for the `rlevels` energy-level table.
 *
 * Written against the real output in `G:\Researches\GRASP\Mo36_results\energy_levels.txt` rather
 * than against the manual, because the manual does not describe the column layout and GRASP pads
 * it by hand in Fortran. The format is fixed-ish but the widths shift once energies pass ten
 * million cm^-1, so the columns are recovered by splitting on whitespace from the left and taking
 * the configuration label as everything that remains.
 *
 * A malformed line is skipped and counted rather than throwing: these files are hundreds of lines
 * of Fortran output and one odd row should not cost the reader the other 271 levels.
 */

export interface GraspLevel {
  /** Running index across all blocks, as printed. */
  readonly no: number
  /** Position within its own J/parity block. */
  readonly pos: number
  /** Total angular momentum, as printed — may be a fraction such as "3/2". */
  readonly J: string
  readonly parity: '+' | '-'
  /** Total energy in Hartree (atomic units). */
  readonly totalEnergy: number
  /** Excitation energy above the ground level, in cm^-1. */
  readonly levelCm: number
  /** Energy difference from the level below, in cm^-1. */
  readonly splittingCm: number
  /** LSJ label, e.g. `2s(2).2p(2)_3P`. */
  readonly configuration: string
}

export interface GraspBlockInfo {
  readonly nblock: number
  readonly ncftot: number
  readonly nw: number
  readonly nelec: number
}

export interface RlevelsFile {
  readonly blocks: readonly GraspBlockInfo[]
  readonly levels: readonly GraspLevel[]
  /** Rydberg constant as printed, useful for checking unit conventions. */
  readonly rydberg?: number
  /** Lines that looked like data but could not be read. */
  readonly skipped: readonly string[]
}

const HEADER = /nblock\s*=\s*(\d+)\s+ncftot\s*=\s*(\d+)\s+nw\s*=\s*(\d+)\s+nelec\s*=\s*(\d+)/
const RYDBERG = /Rydberg constant is\s+([\d.]+)/

/**
 * A data row: index, position, J, parity, then three numbers and a label.
 * J is captured loosely because it prints as `0`, `2`, or `3/2` depending on the ion.
 */
const ROW =
  /^\s*(\d+)\s+(\d+)\s+(\d+(?:\/\d+)?)\s+([+-])\s+(-?[\d.]+)\s+(-?[\d.,]+)\s+(-?[\d.,]+)\s+(\S.*?)\s*$/

/** GRASP prints thousands separators in the cm^-1 columns once the numbers get large. */
const toNumber = (raw: string): number => Number(raw.replaceAll(',', ''))

export function parseRlevels(text: string): RlevelsFile {
  const blocks: GraspBlockInfo[] = []
  const levels: GraspLevel[] = []
  const skipped: string[] = []
  let rydberg: number | undefined

  for (const line of text.split(/\r?\n/)) {
    const header = HEADER.exec(line)
    if (header) {
      blocks.push({
        nblock: Number(header[1]),
        ncftot: Number(header[2]),
        nw: Number(header[3]),
        nelec: Number(header[4]),
      })
      continue
    }

    const ryd = RYDBERG.exec(line)
    if (ryd) {
      rydberg = Number(ryd[1])
      continue
    }

    // Skip rules, titles and the column captions without reporting them as problems.
    if (!/^\s*\d/.test(line)) continue

    const row = ROW.exec(line)
    if (!row) {
      if (line.trim().length > 0) skipped.push(line)
      continue
    }

    const totalEnergy = Number(row[5])
    const levelCm = toNumber(row[6]!)
    const splittingCm = toNumber(row[7]!)

    if (!Number.isFinite(totalEnergy) || !Number.isFinite(levelCm) || !Number.isFinite(splittingCm)) {
      skipped.push(line)
      continue
    }

    levels.push({
      no: Number(row[1]),
      pos: Number(row[2]),
      J: row[3]!,
      parity: row[4] as '+' | '-',
      totalEnergy,
      levelCm,
      splittingCm,
      configuration: row[8]!,
    })
  }

  return { blocks, levels, rydberg, skipped }
}

/** Total CSFs across the parity blocks — the number the papers plot per active-set layer. */
export function totalCsfs(file: RlevelsFile): number {
  return file.blocks.reduce((sum, b) => sum + b.ncftot, 0)
}

/**
 * Compares two runs level by level, which is how the papers estimate uncertainty: the shift in a
 * level between successive active sets is the evidence that it has converged.
 *
 * Matched by level number, since that is stable once the active set is large enough to fix the
 * ordering. Where the ordering has changed, the caller sees a large |dE| and should look.
 */
export interface LevelComparison {
  readonly no: number
  readonly configuration: string
  readonly a: number
  readonly b: number
  /** |E_b - E_a| in cm^-1 — the "|dE|" column of Table 1 in both El-Sayed papers. */
  readonly absDiff: number
}

export function compareRuns(a: RlevelsFile, b: RlevelsFile): LevelComparison[] {
  const byNumber = new Map(b.levels.map((l) => [l.no, l]))

  return a.levels.flatMap((level) => {
    const other = byNumber.get(level.no)
    if (!other) return []
    return [
      {
        no: level.no,
        configuration: level.configuration,
        a: level.levelCm,
        b: other.levelCm,
        absDiff: Math.abs(other.levelCm - level.levelCm),
      },
    ]
  })
}
