import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import path from 'node:path'

import type { Check } from '@core/domain'
import type { AnswerChecker, CheckOutcome } from '@core/ports'

/**
 * Symbolic answer checking, backed by a long-lived SymPy worker.
 *
 * Settles the cases the rule-based checker has to hand over: `\sqrt{9}` against `3`, an
 * unevaluated `2+1`, a factored form against an expanded one.
 *
 * Three properties this must have, in order of importance:
 *
 *  1. It never claims an answer is wrong unless the worker parsed both sides and said so. Anything
 *     ambiguous comes back `unverified` and goes to the tutor.
 *  2. It never breaks the app. No Python, no SymPy, a crash, a hang — all degrade to `unverified`.
 *  3. It is fast enough to feel instant, which is why the worker is persistent: importing SymPy
 *     costs over a second, so spawning per check would defeat the point.
 */

const SIDECAR = path.join(process.cwd(), 'scripts', 'sympy_sidecar.py')
const REQUEST_TIMEOUT_MS = 4000
/** Stop trying after this many consecutive startup failures — usually Python is simply absent. */
const MAX_STARTUP_FAILURES = 2

interface Pending {
  resolve: (value: SidecarResponse) => void
  timer: NodeJS.Timeout
}

interface SidecarResponse {
  id?: string
  ok: boolean
  equal?: boolean
  value?: number | null
  text?: string
  reason?: string
}

export class SympyAnswerChecker implements AnswerChecker {
  private child: ChildProcessWithoutNullStreams | null = null
  private readonly pending = new Map<string, Pending>()
  private buffer = ''
  private nextId = 0
  private startupFailures = 0
  private disabled = false

  constructor(private readonly pythonCommand = process.env.PYTHON_BIN ?? 'python') {}

  /** True when the worker is usable. Callers can surface this without triggering a spawn. */
  get available(): boolean {
    return !this.disabled
  }

  private ensureChild(): ChildProcessWithoutNullStreams | null {
    if (this.disabled) return null
    if (this.child && !this.child.killed) return this.child

    let child: ChildProcessWithoutNullStreams
    try {
      child = spawn(this.pythonCommand, [SIDECAR], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      })
    } catch {
      this.noteStartupFailure('spawn threw')
      return null
    }

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => this.consume(chunk))

    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      // The worker only writes here when something is genuinely wrong.
      console.warn('[sympy] worker stderr:', chunk.trim().slice(0, 300))
    })

    child.on('error', () => {
      this.noteStartupFailure('spawn error — is Python on PATH?')
      this.teardown()
    })

    child.on('exit', (code) => {
      // Exit code 1 on startup means the import of SymPy or antlr failed.
      if (code === 1 && this.pending.size === 0) this.noteStartupFailure('worker exited immediately')
      this.teardown()
    })

    this.child = child
    return child
  }

  private noteStartupFailure(reason: string): void {
    this.startupFailures += 1
    if (this.startupFailures >= MAX_STARTUP_FAILURES && !this.disabled) {
      this.disabled = true
      console.warn(
        `[sympy] Symbolic checking disabled (${reason}). Answers it would have settled now go to the tutor instead. ` +
          'To enable: pip install sympy "antlr4-python3-runtime==4.11.*"',
      )
    }
  }

  /** Fails every in-flight request rather than leaving callers hanging on a dead worker. */
  private teardown(): void {
    this.child = null
    this.buffer = ''
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer)
      entry.resolve({ ok: false, reason: 'worker_gone' })
    }
    this.pending.clear()
  }

  private consume(chunk: string): void {
    this.buffer += chunk

    let newline = this.buffer.indexOf('\n')
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline).trim()
      this.buffer = this.buffer.slice(newline + 1)
      newline = this.buffer.indexOf('\n')

      if (line.length === 0) continue
      let message: SidecarResponse
      try {
        message = JSON.parse(line)
      } catch {
        continue
      }

      if (message.id === 'boot') {
        this.noteStartupFailure(message.reason ?? 'boot failed')
        continue
      }

      const entry = message.id ? this.pending.get(message.id) : undefined
      if (!entry || !message.id) continue
      this.pending.delete(message.id)
      clearTimeout(entry.timer)
      entry.resolve(message)
    }
  }

  private request(payload: Record<string, unknown>): Promise<SidecarResponse> {
    const child = this.ensureChild()
    if (!child) return Promise.resolve({ ok: false, reason: 'unavailable' })

    const id = String((this.nextId += 1))

    return new Promise<SidecarResponse>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        // A hang means a pathological expression; kill the worker so the next call starts clean.
        console.warn('[sympy] request timed out; restarting worker')
        this.child?.kill()
        this.teardown()
        resolve({ ok: false, reason: 'timeout' })
      }, REQUEST_TIMEOUT_MS)

      this.pending.set(id, { resolve, timer })

      try {
        child.stdin.write(`${JSON.stringify({ ...payload, id })}\n`)
      } catch {
        this.pending.delete(id)
        clearTimeout(timer)
        resolve({ ok: false, reason: 'write_failed' })
      }
    })
  }

  /** Are two LaTeX expressions mathematically the same? `null` means undecided. */
  async equal(a: string, b: string): Promise<boolean | null> {
    const response = await this.request({ op: 'equal', a, b })
    if (!response.ok || typeof response.equal !== 'boolean') return null
    return response.equal
  }

  async check(check: Check, answer: string): Promise<CheckOutcome> {
    // Only comparisons with a concrete expected value can be settled symbolically.
    const expected =
      check.type === 'numeric'
        ? String(check.value)
        : check.type === 'latex-equivalent' || check.type === 'symbolic'
          ? check.value
          : check.type === 'exact' && typeof check.value !== 'boolean'
            ? String(check.value)
            : null

    if (expected === null) return { verdict: 'unverified' }

    const candidates =
      check.type === 'latex-equivalent' ? [expected, ...check.accept] : [expected]

    let sawDefiniteMismatch = false
    for (const candidate of candidates) {
      const verdict = await this.equal(answer, candidate)
      if (verdict === true) return { verdict: 'correct' }
      if (verdict === false) sawDefiniteMismatch = true
    }

    // Only report "incorrect" when the worker actually decided. Undecided stays unverified.
    return sawDefiniteMismatch
      ? { verdict: 'incorrect', detail: 'That is not equivalent to the expected answer.' }
      : { verdict: 'unverified' }
  }

  /** Releases the worker. Tests call this so the process can exit. */
  dispose(): void {
    this.child?.kill()
    this.teardown()
  }
}
