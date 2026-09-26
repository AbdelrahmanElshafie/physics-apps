import {
  CORE_CODE,
  CORE_CONFIGURATION,
  LEVEL_WEIGHT_CODE,
  activeSetLabel,
  type GraspSpec,
} from '../domain/grasp'

/**
 * Generates a runnable GRASP2018 pipeline script from a specification.
 *
 * Pure: a spec in, a string out, no filesystem and no processes — so the whole thing is testable,
 * and the same function will feed the WSL runner later.
 *
 * The script is teaching material as well as automation, so every answer is annotated with the
 * prompt it replies to. The annotations sit in a comment block **above** each heredoc, never
 * inside it: a heredoc's contents are the program's standard input, so a trailing `# comment`
 * on an answer line is fed to GRASP as part of that answer. The prompt wording is taken verbatim
 * from the GRASP2018 sources.
 */

export interface ScriptOptions {
  /** Emit `set -e` so the run stops at the first failing program. */
  failFast?: boolean
  /** Include the transition steps. They need two parities, so a single block skips them. */
  includeTransitions?: boolean
}

/** One answer and the prompt it responds to. */
interface Answer {
  value: string
  prompt: string
}

const yn = (value: boolean): string => (value ? 'y' : 'n')

export function generateGraspScript(spec: GraspSpec, options: ScriptOptions = {}): string {
  const { failFast = true, includeTransitions = true } = options
  const L: string[] = []

  const rule = (title: string) => {
    L.push('#================================================================')
    L.push(`# ${title}`)
    L.push('#================================================================')
  }
  const say = (text: string) => L.push(`echo "${text}"`)
  const blank = () => L.push('')

  /**
   * Emits a program invocation: the prompt/answer key as comments, then a clean heredoc.
   * The delimiter is quoted so the shell performs no expansion on the answers.
   */
  const run = (program: string, answers: Answer[]) => {
    L.push(`# ${program} answers, in order:`)
    for (const [i, a] of answers.entries()) {
      L.push(`#   ${String(i + 1).padStart(2)}. ${a.prompt}`.trimEnd())
    }
    L.push(`${program} << 'EOF'`)
    for (const a of answers) L.push(a.value)
    L.push('EOF')
  }

  // ---- header -------------------------------------------------------------
  const setLabel = activeSetLabel(spec.activeSet)
  L.push('#!/bin/bash')
  L.push('#================================================================')
  L.push(`#  GRASP2018 MCDHF calculation: ${spec.name}`)
  if (spec.ion) L.push(`#  Ion: ${spec.ion}`)
  L.push(`#  Z = ${spec.nucleus.Z}, A = ${spec.nucleus.A}, ${spec.electrons} electrons`)
  L.push(
    `#  Core: ${spec.core}${CORE_CONFIGURATION[spec.core] ? ` (${CORE_CONFIGURATION[spec.core]})` : ''}`,
  )
  if (setLabel) {
    L.push(`#  Active set: ${setLabel}, ${excitationWord(spec.activeSet.excitations)} excitations`)
  }
  L.push('#')
  L.push('#  Generated from a calculation spec. Each program is preceded by the list of prompts')
  L.push('#  it will ask, so this can be followed along in an interactive session.')
  L.push('#================================================================')
  blank()

  if (failFast) {
    L.push('# Stop at the first failure: a later program reading a half-written file produces')
    L.push('# results that look plausible and are wrong.')
    L.push('set -e')
    blank()
  }

  L.push(`export GRASP=${spec.graspHome}`)
  L.push('export PATH=$GRASP/bin:$PATH')
  blank()
  L.push(`mkdir -p ${spec.workDir}`)
  L.push(`cd ${spec.workDir}`)
  say('Working in: $(pwd)')
  blank()

  // ---- 1. nucleus ---------------------------------------------------------
  rule('STEP 1: Nuclear data (rnucleus)')
  say(`==== Nuclear data: ${spec.nucleus.element} (Z=${spec.nucleus.Z}, A=${spec.nucleus.A}) ====`)
  run('rnucleus', [
    { value: String(spec.nucleus.Z), prompt: 'Enter the atomic number' },
    { value: String(spec.nucleus.A), prompt: 'Enter the mass number (0 for a point nucleus)' },
    { value: 'n', prompt: 'Revise the default rms radius and skin thickness?' },
    {
      value: String(spec.nucleus.atomicMass),
      prompt: 'Enter the mass of the neutral atom in amu (0 = static nucleus)',
    },
    { value: String(spec.nucleus.spin), prompt: 'Enter the nuclear spin quantum number I' },
    {
      value: String(spec.nucleus.magneticMoment),
      prompt: 'Enter the nuclear dipole moment (nuclear magnetons)',
    },
    {
      value: String(spec.nucleus.quadrupoleMoment),
      prompt: 'Enter the nuclear quadrupole moment (barns)',
    },
  ])
  say('Created: isodata')
  blank()

  // ---- 2. CSF generation --------------------------------------------------
  rule('STEP 2: Configuration state functions (rcsfgenerate)')
  for (const block of spec.blocks) {
    say(`==== CSFs: ${block.label} ====`)
    L.push('rm -f rcsf.out excitationdata clist.new rcsfgenerate.log')
    run('rcsfgenerate', [
      { value: '*', prompt: 'Default, Custom or Exit' },
      { value: String(CORE_CODE[spec.core]), prompt: `Select core (${spec.core})` },
      ...block.reference.map((configuration) => ({
        value: configuration,
        prompt: 'Reference configuration',
      })),
      { value: '*', prompt: 'End of the reference list' },
      {
        value: spec.activeSet.orbitals.join(','),
        prompt: 'Active set: orbitals excitations may reach',
      },
      {
        value: `${block.twoJMin} ${block.twoJMax}`,
        prompt: '2*J range (doubled so half-integers stay integers)',
      },
      {
        value: String(spec.activeSet.excitations),
        prompt: `Number of excitations (${excitationWord(spec.activeSet.excitations)})`,
      },
      { value: 'n', prompt: 'Generate another list?' },
      { value: 'y', prompt: 'Confirm' },
    ])
    L.push(`mv rcsf.out ${block.id}.c`)
    say(`Created: ${block.id}.c`)
    blank()
  }

  // ---- 3. angular coefficients -------------------------------------------
  rule('STEP 3: Angular coefficients (rangular)')
  L.push('# These depend only on the CSF list, so they are computed once per parity and kept.')
  for (const block of spec.blocks) {
    say(`==== Angular coefficients: ${block.label} ====`)
    L.push(`cp ${block.id}.c rcsf.inp`)
    L.push('rm -f mcp.*')
    run('rangular', [{ value: 'y', prompt: 'Default settings?' }])
    L.push(`mkdir -p ${block.id}_mcp`)
    L.push(`mv mcp.* ${block.id}_mcp/`)
    blank()
  }

  // ---- 4/5. estimate + SCF ------------------------------------------------
  rule('STEP 4-5: Initial orbitals (rwfnestimate) and SCF (rmcdhf)')
  for (const block of spec.blocks) {
    say(`==== MCDHF: ${block.label} ====`)
    L.push(`cp ${block.id}.c rcsf.inp`)
    L.push('rm -f mcp.*')
    L.push(`cp ${block.id}_mcp/mcp.* .`)
    blank()
    run('rwfnestimate', [
      { value: 'y', prompt: 'Default settings?' },
      { value: '2', prompt: 'Source of the initial estimate (2 = Thomas-Fermi)' },
      { value: '*', prompt: 'Apply to all orbitals' },
    ])
    blank()

    const levelAnswers: Answer[] = [{ value: 'y', prompt: 'Default settings?' }]
    for (let i = 1; i <= block.blockCount; i += 1) {
      levelAnswers.push({
        value: '1',
        prompt: `Block ${i} of ${block.blockCount}: level(s) to optimise on`,
      })
    }
    levelAnswers.push(
      {
        value: String(LEVEL_WEIGHT_CODE[spec.levelWeights]),
        prompt: `Level weights (1 equal, 5 standard, 9 user) -> ${spec.levelWeights}`,
      },
      { value: spec.varyOrbitals, prompt: 'Enter orbitals to be varied (updating order)' },
      { value: spec.spectroscopicOrbitals, prompt: 'Which of these are spectroscopic orbitals?' },
      { value: String(spec.maxScfCycles), prompt: 'Enter the maximum number of SCF cycles' },
    )
    run('rmcdhf', levelAnswers)
    blank()

    L.push(`cp rwfn.out ${block.id}.w`)
    L.push(`cp rmix.out ${block.id}.m`)
    say(`Created: ${block.id}.w, ${block.id}.m`)
    blank()
  }

  // ---- 6. RCI -------------------------------------------------------------
  rule('STEP 6: Relativistic CI with Breit and QED (rci)')
  L.push('# This is where the physics beyond Dirac-Coulomb enters: the transverse photon')
  L.push('# (Breit) interaction and the leading QED corrections.')
  for (const block of spec.blocks) {
    say(`==== RCI: ${block.label} ====`)
    L.push(`cp ${block.id}.c rcsf.inp`)
    L.push(`cp ${block.id}.w rwfn.inp`)
    L.push('rm -f mcp.*')
    L.push(`cp ${block.id}_mcp/mcp.* .`)
    blank()

    const rciAnswers: Answer[] = [
      { value: 'y', prompt: 'Default settings?' },
      { value: block.id, prompt: 'Name of the state (file stem)' },
      {
        value: yn(spec.rci.transverse),
        prompt: 'Include contribution of H (Transverse)?  <- the Breit interaction',
      },
      {
        value: yn(spec.rci.modifyFrequencies),
        prompt: 'Modify all transverse photon frequencies?',
      },
      {
        value: yn(spec.rci.vacuumPolarisation),
        prompt: 'Include H (Vacuum Polarisation)?  <- QED',
      },
      { value: yn(spec.rci.normalMassShift), prompt: 'Include H (Normal Mass Shift)?' },
      { value: yn(spec.rci.specificMassShift), prompt: 'Include H (Specific Mass Shift)?' },
      {
        value: yn(spec.rci.selfEnergy),
        prompt: 'Estimate self-energy?  <- QED, the larger term',
      },
    ]
    if (spec.rci.selfEnergy) {
      rciAnswers.push({
        value: String(spec.rci.selfEnergyMaxN),
        prompt: 'Largest n included in the self-energy estimate',
      })
    }
    for (let i = 1; i <= block.blockCount; i += 1) {
      rciAnswers.push({
        value: block.levels,
        prompt: `Block ${i}: serial numbers of the levels to keep`,
      })
    }
    run('rci', rciAnswers)
    say(`Created: ${block.id}.cm, ${block.id}.csum`)
    blank()
  }

  // ---- 7. LSJ labelling ---------------------------------------------------
  rule('STEP 7: jj -> LSJ labelling (jj2lsj)')
  L.push('# GRASP works in jj coupling. Spectroscopic labels are LSJ, so the wavefunctions are')
  L.push('# re-expressed to give levels names a reader of the literature will recognise.')
  for (const block of spec.blocks) {
    run('jj2lsj', [
      { value: block.id, prompt: 'Name of the state' },
      { value: 'y', prompt: 'Use the CI mixing coefficients?' },
      { value: 'n', prompt: 'Produce the full expansion listing?' },
      { value: 'y', prompt: 'Confirm' },
    ])
  }
  say('Created: *.lsj.lbl')
  blank()

  // ---- 8. level table -----------------------------------------------------
  rule('STEP 8: Energy level table (rlevels)')
  L.push('rlevels << EOF')
  for (const block of spec.blocks) L.push(`${block.id}.cm`)
  L.push('')
  L.push('EOF')
  blank()

  // ---- 9. transitions -----------------------------------------------------
  if (includeTransitions && spec.blocks.length >= 2) {
    rule('STEP 9: Transitions (rbiotransform, rtransition)')
    L.push('# The two parities were optimised separately, so their orbital sets are not')
    L.push('# orthogonal. rbiotransform fixes that before any transition integral is computed;')
    L.push('# skipping it gives wrong rates rather than an error.')
    const [a, b] = [spec.blocks[0]!, spec.blocks[1]!]

    run('rbiotransform', [
      { value: 'y', prompt: 'Default settings?' },
      { value: 'y', prompt: 'Use the CI mixing coefficients?' },
      { value: a.id, prompt: 'Name of the initial state' },
      { value: b.id, prompt: 'Name of the final state' },
      { value: 'y', prompt: 'Confirm' },
    ])
    blank()

    for (const multipole of ['E1', 'M1', 'E2', 'M2']) {
      run('rtransition', [
        { value: 'y', prompt: 'Default settings?' },
        { value: 'y', prompt: 'Use the CI mixing coefficients?' },
        { value: a.id, prompt: 'Name of the initial state' },
        { value: b.id, prompt: 'Name of the final state' },
        { value: multipole, prompt: `Multipole (${multipole})` },
      ])
      L.push(`mv ${a.id}.${b.id}.ct ${a.id}.${b.id}.${multipole}.ct 2>/dev/null || true`)
      blank()
    }
  }

  rule('Done')
  say('Calculation complete. Key outputs:')
  say('  *.cm        RCI mixing coefficients and energies')
  say('  *.lsj.lbl   LSJ labels for each level')
  say('  *.ct        transition data (line strengths, rates, oscillator strengths)')
  blank()

  return `${L.join('\n')}\n`
}

function excitationWord(level: 1 | 2 | 3): string {
  return level === 1 ? 'single' : level === 2 ? 'single and double (SD)' : 'up to triple'
}
