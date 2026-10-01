import { describe, expect, it } from 'vitest'
import { freshCardState, isDue, isLapsed, isNew, scheduleNext } from '../src/scheduler'

const DAY = 24 * 60 * 60 * 1000

describe('freshCardState', () => {
  it('is new and already due', () => {
    const state = freshCardState('card-1')
    expect(isNew(state)).toBe(true)
    expect(isDue(state, new Date())).toBe(true)
    expect(state.repetitions).toBe(0)
    expect(state.lapses).toBe(0)
  })
})

describe('scheduleNext', () => {
  it('grows the interval through a run of "good" grades (1, 6, then ease-multiplied)', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    let state = freshCardState('card-1')

    state = scheduleNext(state, 'good', now)
    expect(state.repetitions).toBe(1)
    expect(state.intervalDays).toBe(1)
    expect(isNew(state)).toBe(false)

    state = scheduleNext(state, 'good', now)
    expect(state.repetitions).toBe(2)
    expect(state.intervalDays).toBe(6)

    const beforeEase = state.easeFactor
    state = scheduleNext(state, 'good', now)
    expect(state.repetitions).toBe(3)
    expect(state.intervalDays).toBe(Math.round(6 * beforeEase))
  })

  it('"again" resets repetitions, shortens the interval to 1 day, and counts a lapse', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    let state = freshCardState('card-1')
    state = scheduleNext(state, 'good', now)
    state = scheduleNext(state, 'good', now)
    expect(state.lapses).toBe(0)

    const relapsed = scheduleNext(state, 'again', now)
    expect(relapsed.repetitions).toBe(0)
    expect(relapsed.intervalDays).toBe(1)
    expect(relapsed.lapses).toBe(1)
    expect(relapsed.dueAt).toBe(new Date(now.getTime() + DAY).toISOString())
    expect(isLapsed(relapsed)).toBe(true)
  })

  it('a lapsed card stops counting as lapsed once it recovers with another grade', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const relapsed = scheduleNext(freshCardState('card-1'), 'again', now)
    const recovered = scheduleNext(relapsed, 'good', now)
    expect(recovered.lapses).toBe(1) // history is kept
    expect(isLapsed(recovered)).toBe(false) // but no longer "currently struggling"
  })

  it('"easy" grows the interval further than "good" and raises the ease factor', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const goodPath = scheduleNext(scheduleNext(freshCardState('c'), 'good', now), 'good', now)
    const easyPath = scheduleNext(scheduleNext(freshCardState('c'), 'easy', now), 'easy', now)
    expect(easyPath.intervalDays).toBeGreaterThan(goodPath.intervalDays)
    expect(easyPath.easeFactor).toBeGreaterThan(goodPath.easeFactor)
  })

  it('"hard" shrinks growth relative to "good" and lowers the ease factor, floored at 1.3', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    let hard = freshCardState('c')
    for (let i = 0; i < 20; i++) hard = scheduleNext(hard, 'hard', now)
    expect(hard.easeFactor).toBeCloseTo(1.3, 5)

    const good = scheduleNext(freshCardState('c2'), 'good', now)
    const hardOnce = scheduleNext(freshCardState('c2'), 'hard', now)
    expect(hardOnce.easeFactor).toBeLessThan(good.easeFactor)
  })

  it('isDue reflects the due date relative to the clock passed in', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const state = scheduleNext(freshCardState('c'), 'good', now)
    expect(isDue(state, now)).toBe(false)
    expect(isDue(state, new Date(now.getTime() + 2 * DAY))).toBe(true)
  })
})
