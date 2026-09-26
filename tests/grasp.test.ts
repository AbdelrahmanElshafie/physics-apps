import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { activeSetLabel, graspSpecSchema, type GraspSpec } from '@core/domain'
import { generateGraspScript } from '@core/services'
import { compareRuns, parseRlevels, totalCsfs } from '@adapters/grasp/parse/rlevels'

/**
 * These run against real GRASP2018 artefacts, not invented ones.
 *
 * `tests/fixtures/mo36-energy-levels.txt` is the actual rlevels output from a completed C-like Mo
 * calculation, and `mo36-reference-script.sh` is the hand-written pipeline that produced it. A
 * parser validated only against a sample I made up would encode my assumptions about the format
 * rather than the format.
 */

const fixture = (name: string) =>
  fs.readFileSync(path.join(process.cwd(), 'tests', 'fixtures', name), 'utf8')

/** The Mo36+ run, expressed as a spec — the same calculation the reference script performs. */
const MO36: GraspSpec = graspSpecSchema.parse({
  name: 'Mo36_calculation',
  ion: 'Mo XXXVII (C-like Mo)',
  electrons: 6,
  nucleus: { element: 'Mo', Z: 42, A: 98, atomicMass: 0, spin: 0, magneticMoment: 0, quadrupoleMoment: 0 },
  core: 'He',
  blocks: [
    {
      id: 'even',
      label: 'Even parity',
      reference: ['2s(2,*)2p(2,*)'],
      twoJMin: 0,
      twoJMax: 4,
      blockCount: 3,
      levels: '1-10',
    },
    {
      id: 'odd',
      label: 'Odd parity',
      reference: ['2s(1,*)2p(3,*)'],
      twoJMin: 0,
      twoJMax: 6,
      blockCount: 4,
      levels: '1-10',
    },
  ],
  activeSet: { orbitals: ['3s', '3p', '3d'], excitations: 2 },
  varyOrbitals: '*',
  spectroscopicOrbitals: '1s,2s,2p-,2p',
  levelWeights: 'standard',
  maxScfCycles: 100,
  rci: {
    transverse: true,
    modifyFrequencies: false,
    vacuumPolarisation: true,
    normalMassShift: true,
    specificMassShift: true,
    selfEnergy: true,
    selfEnergyMaxN: 3,
  },
  graspHome: '/home/bodo/GRASP2018',
  workDir: '~/Mo36_calculation',
})

describe('generateGraspScript', () => {
  const script = generateGraspScript(MO36)

  it('runs the programs in the order the method requires', () => {
    const order = [
      'rnucleus',
      'rcsfgenerate',
      'rangular',
      'rwfnestimate',
      'rmcdhf',
      'rci',
      'jj2lsj',
      'rlevels',
    ]
    const positions = order.map((program) => script.indexOf(`\n${program} <<`))

    for (const [i, position] of positions.entries()) {
      expect(position, `${order[i]} missing`).toBeGreaterThan(-1)
    }
    // Each program must appear after the one it depends on.
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('answers rcsfgenerate with the same values as the reference script', () => {
    // Core 1 = He, matching a C-like ion whose 1s shell is closed.
    expect(script).toContain('Select core (He)')
    expect(script).toContain('2s(2,*)2p(2,*)')
    expect(script).toContain('2s(1,*)2p(3,*)')
    expect(script).toContain('3s,3p,3d')
    expect(script).toContain('0 4')
    expect(script).toContain('0 6')
    expect(script).toContain('Number of excitations (single and double (SD))')
  })

  it('asks rmcdhf for one level selection per J block', () => {
    // Even has 3 blocks, odd has 4 — get this wrong and rmcdhf consumes the next answer as a
    // level number, which fails much later and confusingly.
    expect(script).toContain('Block 3 of 3: level(s) to optimise on')
    expect(script).toContain('Block 4 of 4: level(s) to optimise on')
    expect(script).not.toContain('Block 5 of')
  })

  it('selects standard level weights', () => {
    expect(script).toContain('Level weights (1 equal, 5 standard, 9 user) -> standard')
  })

  it('turns on Breit and both QED terms', () => {
    expect(script).toContain('Include contribution of H (Transverse)?  <- the Breit interaction')
    expect(script).toContain('Include H (Vacuum Polarisation)?  <- QED')
    expect(script).toContain('Estimate self-energy?  <- QED, the larger term')
    expect(script).toContain('Largest n included in the self-energy estimate')
  })

  it('omits the self-energy cutoff when self-energy is off', () => {
    const noQed = generateGraspScript({
      ...MO36,
      rci: { ...MO36.rci, selfEnergy: false },
    })
    expect(noQed).not.toContain('Largest n included in the self-energy estimate')
  })

  it('biorthogonalises before computing transitions', () => {
    // Separately optimised parities have non-orthogonal orbitals; skipping this gives wrong
    // transition rates rather than an error.
    const bio = script.indexOf('rbiotransform')
    const trans = script.indexOf('rtransition')
    expect(bio).toBeGreaterThan(-1)
    expect(trans).toBeGreaterThan(bio)
  })

  it('emits all four multipoles the papers report', () => {
    for (const multipole of ['E1', 'M1', 'E2', 'M2']) {
      expect(script).toContain(`Multipole (${multipole})`)
    }
  })

  it('skips transitions when there is only one parity block', () => {
    const single = generateGraspScript({ ...MO36, blocks: [MO36.blocks[0]!] })
    expect(single).not.toContain('rtransition')
  })

  it('fails fast by default', () => {
    expect(script).toContain('set -e')
    expect(generateGraspScript(MO36, { failFast: false })).not.toContain('set -e')
  })

  it('produces a script whose every heredoc is closed', () => {
    const opens = (script.match(/<< '?EOF'?/g) ?? []).length
    const closes = (script.match(/^EOF$/gm) ?? []).length
    expect(closes).toBe(opens)
  })

  it('never puts a comment inside a heredoc', () => {
    // A heredoc's contents are the program's stdin, so an annotated answer line is fed to GRASP
    // as part of the answer. This bug cost a real run: rnucleus died on end-of-file.
    let insideHeredoc = false
    const offenders: string[] = []

    for (const line of script.split('\n')) {
      if (/<< '?EOF'?$/.test(line)) {
        insideHeredoc = true
        continue
      }
      if (line === 'EOF') {
        insideHeredoc = false
        continue
      }
      if (insideHeredoc && line.includes('#')) offenders.push(line)
    }
    expect(offenders).toEqual([])
  })

  it('answers all seven rnucleus prompts', () => {
    // The mass of the neutral atom sits between "revise these values?" and the nuclear spin.
    // Omitting it shifts every later answer up by one and the program dies on end-of-file.
    const section = script.slice(script.indexOf('rnucleus'), script.indexOf('STEP 2'))
    const body = section.slice(section.indexOf("<< 'EOF'") + 8, section.indexOf('\nEOF'))
    const answers = body.split('\n').filter((l) => l.trim().length > 0)

    expect(answers).toEqual(['42', '98', 'n', '0', '0', '0', '0'])
  })

  it('covers the same programs the hand-written reference script used', () => {
    const reference = fixture('mo36-reference-script.sh')
    const used = ['rnucleus', 'rcsfgenerate', 'rangular', 'rwfnestimate', 'rmcdhf', 'rci', 'rlevels']

    for (const program of used) {
      expect(reference, `reference uses ${program}`).toContain(program)
      expect(script, `generated is missing ${program}`).toContain(program)
    }
  })
})

describe('activeSetLabel', () => {
  it('describes the active set the way the papers do', () => {
    expect(activeSetLabel({ orbitals: ['3s', '3p', '3d'], excitations: 2 })).toBe('n <= 3, l <= 2')
    expect(
      activeSetLabel({ orbitals: ['6s', '6p', '6d', '6f'], excitations: 2 }),
    ).toBe('n <= 6, l <= 3')
  })

  it('returns null for a multireference-only calculation', () => {
    expect(activeSetLabel({ orbitals: [], excitations: 2 })).toBeNull()
  })
})

describe('parseRlevels, against real GRASP output', () => {
  const parsed = parseRlevels(fixture('mo36-energy-levels.txt'))

  it('reads every level without skipping any line', () => {
    expect(parsed.levels).toHaveLength(70)
    expect(parsed.skipped).toEqual([])
  })

  it('reads the block headers', () => {
    // Two parities: 3 J blocks with 346 CSFs, and 4 with 423.
    expect(parsed.blocks).toEqual([
      { nblock: 3, ncftot: 346, nw: 9, nelec: 6 },
      { nblock: 4, ncftot: 423, nw: 9, nelec: 6 },
    ])
    expect(totalCsfs(parsed)).toBe(769)
  })

  it('reads the ground level exactly', () => {
    const ground = parsed.levels[0]!
    expect(ground.no).toBe(1)
    expect(ground.J).toBe('0')
    expect(ground.parity).toBe('+')
    expect(ground.totalEnergy).toBeCloseTo(-2573.3493674, 6)
    expect(ground.levelCm).toBe(0)
    expect(ground.configuration).toBe('2s(2).2p(2)_3P')
  })

  it('strips the thousands separators GRASP prints in the cm^-1 columns', () => {
    const second = parsed.levels[1]!
    expect(second.levelCm).toBe(834742.25)
    expect(second.splittingCm).toBe(834742.25)
  })

  it('reads an eight-figure energy, where the columns shift', () => {
    const level21 = parsed.levels.find((l) => l.no === 21)!
    expect(level21.levelCm).toBe(24083871.61)
    expect(level21.splittingCm).toBe(17614936.57)
    expect(level21.configuration).toBe('2s(2).2p.3p_3P')
  })

  it('reads both parities', () => {
    expect(parsed.levels.some((l) => l.parity === '+')).toBe(true)
    expect(parsed.levels.some((l) => l.parity === '-')).toBe(true)
  })

  it('reads the Rydberg constant', () => {
    expect(parsed.rydberg).toBeCloseTo(109737.31569, 4)
  })

  it('keeps levels in ascending energy order', () => {
    const energies = parsed.levels.map((l) => l.levelCm)
    expect(energies).toEqual([...energies].sort((a, b) => a - b))
  })

  it('has splittings consistent with the level energies', () => {
    // Each splitting is the gap to the level below, so they must telescope.
    for (let i = 1; i < parsed.levels.length; i += 1) {
      const gap = parsed.levels[i]!.levelCm - parsed.levels[i - 1]!.levelCm
      expect(parsed.levels[i]!.splittingCm).toBeCloseTo(gap, 1)
    }
  })

  it('survives a malformed line by skipping it, not throwing', () => {
    const damaged = `${fixture('mo36-energy-levels.txt')}\n  99  1   0  +   not-a-number  x  y  junk\n`
    const result = parseRlevels(damaged)
    expect(result.levels).toHaveLength(70)
    expect(result.skipped).toHaveLength(1)
  })
})

describe('compareRuns', () => {
  it('reports the per-level shift between two active sets', () => {
    const a = parseRlevels(fixture('mo36-energy-levels.txt'))
    // Simulate a later layer by shifting one level, as a larger active set would.
    const shifted = parseRlevels(
      fixture('mo36-energy-levels.txt').replace('834742.25', '834800.25'),
    )

    const diffs = compareRuns(a, shifted)
    const level2 = diffs.find((d) => d.no === 2)!

    expect(level2.absDiff).toBeCloseTo(58, 1)
    expect(diffs.find((d) => d.no === 1)!.absDiff).toBe(0)
  })
})
