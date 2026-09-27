import type { TopicId } from '@physics/core/domain'
import type { TutorTransport } from '@physics/core/ports'
import { describe, expect, it, vi } from 'vitest'

import { askTutor, threadFor } from '../src/ask-tutor'

const topic = 'nuclear-physics:m1.1-hilbert-spaces' as TopicId

describe('threadFor', () => {
  it('names a thread by topic + exercise, so a follow-up lands in the same conversation', () => {
    expect(threadFor({ topicId: topic, exerciseId: 'q7a' })).toBe(`${topic}#q7a`)
  })

  it('names a thread by topic + equation when there is no exercise', () => {
    expect(threadFor({ topicId: topic, equationId: 'eq1' })).toBe(`${topic}@eq1`)
  })

  it('falls back to the bare topic, then to "general"', () => {
    expect(threadFor({ topicId: topic })).toBe(String(topic))
    expect(threadFor({})).toBe('general')
  })
})

describe('askTutor', () => {
  it('rejects an empty (or whitespace-only) question rather than sending it', async () => {
    const transport = { send: vi.fn() } as unknown as TutorTransport
    await expect(askTutor(transport, { threadId: threadFor({}), body: '   ' })).rejects.toThrow(
      /empty question/,
    )
    expect(transport.send).not.toHaveBeenCalled()
  })

  it('trims the body and forwards it to the transport', async () => {
    const send = vi.fn().mockResolvedValue('msg1')
    const transport = { send } as unknown as TutorTransport
    const threadId = threadFor({ topicId: topic })

    const id = await askTutor(transport, { threadId, body: '  what is I?  ' })

    expect(id).toBe('msg1')
    expect(send).toHaveBeenCalledWith({ threadId, body: 'what is I?', context: {} })
  })
})
