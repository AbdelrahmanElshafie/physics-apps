import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { asThreadId } from '@physics/core/domain'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ClaudeCodeTutorTransport } from '../src/claude-code-transport'

describe('ClaudeCodeTutorTransport', () => {
  let root: string
  let transport: ClaudeCodeTutorTransport

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'tutor-bridge-test-'))
    transport = new ClaudeCodeTutorTransport(root)
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('declares itself deferred, non-streaming — a human answers these', () => {
    expect(transport.id).toBe('claude-code')
    expect(transport.capabilities).toEqual({
      streaming: false,
      latency: 'deferred',
      awareOfProgress: false,
    })
  })

  it('send() then history() round-trips a learner question', async () => {
    const threadId = asThreadId('topic-1#ex1')
    await transport.send({ threadId, body: 'Why is the current the same here?', context: {} })

    const history = await transport.history(threadId)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      threadId,
      role: 'learner',
      body: 'Why is the current the same here?',
      pending: true,
    })
  })

  it('pending() lists an unanswered question across threads, and reply() clears it', async () => {
    const threadId = asThreadId('topic-1#ex1')
    const sentId = await transport.send({ threadId, body: 'What went wrong?', context: {} })

    const before = await transport.pending()
    expect(before).toHaveLength(1)
    expect(before[0]!.request.id).toBe(sentId)

    await transport.reply({ threadId, answers: sentId, body: 'You dropped a sign in step 2.' })

    const after = await transport.pending()
    expect(after).toHaveLength(0)

    const history = await transport.history(threadId)
    expect(history).toHaveLength(2)
    const learnerMsg = history.find((m) => m.role === 'learner')
    expect(learnerMsg?.pending).toBeUndefined() // answered — no longer pending
  })

  it('keeps threads for different topics separate', async () => {
    await transport.send({ threadId: asThreadId('a#q1'), body: 'Question A', context: {} })
    await transport.send({ threadId: asThreadId('b#q1'), body: 'Question B', context: {} })

    expect(await transport.history(asThreadId('a#q1'))).toHaveLength(1)
    expect(await transport.history(asThreadId('b#q1'))).toHaveLength(1)
  })
})
