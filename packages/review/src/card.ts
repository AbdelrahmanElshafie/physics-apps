import { z } from 'zod'

/**
 * A review card, version 1.
 *
 * Deliberately a flat front/back pair rather than a fork of the exercise schema: a card is
 * something to *recall*, not something to grade with partial credit or a written justification.
 * `frontPronunciation` is optional and separate from `front` because `front` is often the
 * target-language script itself (hanzi, Cyrillic) while pronunciation is a second, learner-facing
 * rendering of it (toned pinyin, stressed Cyrillic) — collapsing them would make a card that is
 * both the question and a free hint at the same time.
 *
 * `exerciseIds` links a card to the lesson exercise(s) that already test the same word, so a wrong
 * answer there can surface this card as needing practice without the exercise schema itself ever
 * knowing review cards exist.
 */
export const CARD_KINDS = ['letter', 'word', 'sentence'] as const
export type CardKind = (typeof CARD_KINDS)[number]

export const reviewCardSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(CARD_KINDS),
  topicId: z.string().min(1),
  front: z.string().min(1),
  frontPronunciation: z.string().optional(),
  back: z.string().min(1),
  /** Overrides what gets spoken aloud, when `front` itself isn't speakable text (rare). */
  audioText: z.string().optional(),
  exerciseIds: z.array(z.string().min(1)).default([]),
})
export type ReviewCard = z.infer<typeof reviewCardSchema>

export const reviewDeckFileSchema = z.object({
  schemaVersion: z.literal(1),
  topic: z.string().min(1),
  cards: z.array(reviewCardSchema).min(1),
})
export type ReviewDeckFile = z.infer<typeof reviewDeckFileSchema>
