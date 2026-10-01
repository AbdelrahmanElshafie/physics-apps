import { describe, expect, it } from 'vitest'
import { reviewCardSchema, reviewDeckFileSchema } from '../src/card'

describe('reviewCardSchema', () => {
  it('accepts a minimal valid card, defaulting exerciseIds to empty', () => {
    const card = reviewCardSchema.parse({
      id: 'greetings-xiexie',
      kind: 'word',
      topicId: 'mandarin:greetings',
      front: '谢谢',
      back: 'thank you',
    })
    expect(card.exerciseIds).toEqual([])
  })

  it('accepts a full card with pronunciation, audio override, and exercise links', () => {
    const card = reviewCardSchema.parse({
      id: 'greetings-xiexie',
      kind: 'word',
      topicId: 'mandarin:greetings',
      front: '谢谢',
      frontPronunciation: 'xièxie',
      back: 'thank you',
      audioText: '谢谢',
      exerciseIds: ['gr4'],
    })
    expect(card.exerciseIds).toEqual(['gr4'])
  })

  it('rejects an unknown kind', () => {
    expect(() =>
      reviewCardSchema.parse({ id: 'x', kind: 'phrase', topicId: 't', front: 'a', back: 'b' }),
    ).toThrow()
  })

  it('rejects a missing required field', () => {
    expect(() => reviewCardSchema.parse({ id: 'x', kind: 'word', topicId: 't', front: 'a' })).toThrow()
  })
})

describe('reviewDeckFileSchema', () => {
  it('accepts a deck with schemaVersion 1 and at least one card', () => {
    const deck = reviewDeckFileSchema.parse({
      schemaVersion: 1,
      topic: 'greetings',
      cards: [{ id: 'c1', kind: 'word', topicId: 'mandarin:greetings', front: 'a', back: 'b' }],
    })
    expect(deck.cards).toHaveLength(1)
  })

  it('rejects an empty card list', () => {
    expect(() => reviewDeckFileSchema.parse({ schemaVersion: 1, topic: 'greetings', cards: [] })).toThrow()
  })
})
