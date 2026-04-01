import { describe, expect, it } from 'vitest'
import { jobDataSchema } from '../../workers/onboardingReminderWorker'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

describe('onboardingReminderWorker window computation', () => {
  it('defaults to scanning 1–2 days ago', () => {
    const now = new Date('2026-04-01T12:00:00Z').getTime()
    const { windowOffsetMs } = jobDataSchema.parse({})
    const windowStart = new Date(now - windowOffsetMs - ONE_DAY_MS)
    const windowEnd = new Date(now - windowOffsetMs)

    expect(windowStart.toISOString()).toBe('2026-03-30T12:00:00.000Z')
    expect(windowEnd.toISOString()).toBe('2026-03-31T12:00:00.000Z')
  })

  it('shifts window back by windowOffsetMs', () => {
    const now = new Date('2026-04-01T12:00:00Z').getTime()
    const { windowOffsetMs } = jobDataSchema.parse({ windowOffsetMs: 2 * ONE_DAY_MS })
    const windowStart = new Date(now - windowOffsetMs - ONE_DAY_MS)
    const windowEnd = new Date(now - windowOffsetMs)

    expect(windowStart.toISOString()).toBe('2026-03-29T12:00:00.000Z')
    expect(windowEnd.toISOString()).toBe('2026-03-30T12:00:00.000Z')
  })
})
