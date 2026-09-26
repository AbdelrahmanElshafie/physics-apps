/**
 * Generates a runnable GRASP2018 pipeline script from a calculation spec.
 *
 *   pnpm grasp:script specs/mo36.yaml            print to stdout
 *   pnpm grasp:script specs/mo36.yaml -o run.sh  write to a file
 *
 * The spec is YAML so it can be read and edited as easily as the script it produces, and diffed
 * when you change one parameter and want to see what moved. Validation is the same Zod schema the
 * app uses, so a spec that generates here will drive the WSL runner unchanged later.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'

import { graspSpecSchema, activeSetLabel } from '../src/core/domain/grasp'
import { generateGraspScript } from '../src/core/services/grasp-script'

const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const specPath = args.find((a) => !a.startsWith('-'))

  if (!specPath) {
    console.error('Usage: pnpm grasp:script <spec.yaml> [-o output.sh] [--no-transitions]')
    console.error('Example specs live in specs/.')
    process.exitCode = 1
    return
  }

  const outIndex = args.indexOf('-o')
  const outPath = outIndex >= 0 ? args[outIndex + 1] : undefined

  let raw: string
  try {
    raw = await fs.readFile(path.resolve(specPath), 'utf8')
  } catch {
    console.error(red(`Cannot read spec: ${specPath}`))
    process.exitCode = 1
    return
  }

  const parsed = graspSpecSchema.safeParse(parseYaml(raw))
  if (!parsed.success) {
    console.error(red(`\n${specPath} is not a valid calculation spec:\n`))
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    }
    process.exitCode = 1
    return
  }

  const spec = parsed.data
  const script = generateGraspScript(spec, {
    includeTransitions: !args.includes('--no-transitions'),
  })

  if (!outPath) {
    process.stdout.write(script)
    return
  }

  await fs.mkdir(path.dirname(path.resolve(outPath)), { recursive: true })
  await fs.writeFile(outPath, script, 'utf8')
  // Scripts are meant to be run, so make that possible without a second command.
  await fs.chmod(outPath, 0o755).catch(() => undefined)

  const blocks = spec.blocks.map((b) => `${b.label} (${b.blockCount} J blocks)`).join(', ')
  console.log(green(`\n  Wrote ${outPath}`))
  console.log(dim(`  ${spec.ion || spec.name} — Z=${spec.nucleus.Z}, ${spec.electrons} electrons`))
  console.log(dim(`  ${blocks}`))
  console.log(dim(`  Active set: ${activeSetLabel(spec.activeSet) ?? 'multireference only'}`))
  console.log(
    dim(
      `  Breit: ${spec.rci.transverse ? 'yes' : 'no'}, ` +
        `QED: ${spec.rci.vacuumPolarisation || spec.rci.selfEnergy ? 'yes' : 'no'}\n`,
    ),
  )
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
