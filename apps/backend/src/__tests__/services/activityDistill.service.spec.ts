import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock prisma before imports
vi.mock('../../lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    userActivitySummary: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    userSessionLog: {
      deleteMany: vi.fn(),
    },
  },
}))

import {
  computeRawSegment,
  applyHysteresis,
  distillActivitySegments,
} from '../../services/activityDistill.service'
import { prisma } from '../../lib/prisma'

const mockedPrisma = vi.mocked(prisma, true)

function daysAgo(days: number, from = new Date()): Date {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000)
}

describe('computeRawSegment', () => {
  const now = new Date('2026-03-01T12:00:00Z')

  it('returns dormant when lastSeenAt is 14+ days ago', () => {
    const result = computeRawSegment(daysAgo(14, now), daysAgo(100, now), 5, now)
    expect(result).toBe('dormant')
  })

  it('returns dormant when lastSeenAt is 20 days ago even with high activeDays', () => {
    const result = computeRawSegment(daysAgo(20, now), daysAgo(100, now), 15, now)
    expect(result).toBe('dormant')
  })

  it('returns new when firstSeenAt within 3 days and activeDays ≤ 2', () => {
    const result = computeRawSegment(daysAgo(0, now), daysAgo(2, now), 2, now)
    expect(result).toBe('new')
  })

  it('does not return new when activeDays > 2', () => {
    const result = computeRawSegment(daysAgo(0, now), daysAgo(2, now), 3, now)
    // Should be returning since activeDays < 8
    expect(result).toBe('returning')
  })

  it('does not return new when firstSeenAt is older than 3 days', () => {
    const result = computeRawSegment(daysAgo(0, now), daysAgo(4, now), 1, now)
    expect(result).toBe('returning')
  })

  it('returns frequent when activeDays28 >= 8', () => {
    const result = computeRawSegment(daysAgo(0, now), daysAgo(30, now), 8, now)
    expect(result).toBe('frequent')
  })

  it('returns returning as default', () => {
    const result = computeRawSegment(daysAgo(1, now), daysAgo(10, now), 4, now)
    expect(result).toBe('returning')
  })

  it('dormant overrides frequent (priority)', () => {
    // User has lots of active days but hasn't been seen recently
    const result = computeRawSegment(daysAgo(15, now), daysAgo(30, now), 12, now)
    expect(result).toBe('dormant')
  })
})

describe('applyHysteresis', () => {
  it('promotes immediately', () => {
    const result = applyHysteresis('returning', 'frequent', 0)
    expect(result).toEqual({ segment: 'frequent', demotionStreak: 0 })
  })

  it('keeps current segment on first demotion (streak = 0 → 1)', () => {
    const result = applyHysteresis('frequent', 'returning', 0)
    expect(result).toEqual({ segment: 'frequent', demotionStreak: 1 })
  })

  it('applies demotion when streak reaches K=2', () => {
    const result = applyHysteresis('frequent', 'returning', 1)
    expect(result).toEqual({ segment: 'returning', demotionStreak: 0 })
  })

  it('resets demotion streak on promotion', () => {
    const result = applyHysteresis('returning', 'frequent', 1)
    expect(result).toEqual({ segment: 'frequent', demotionStreak: 0 })
  })

  it('keeps same segment without streaking', () => {
    const result = applyHysteresis('frequent', 'frequent', 0)
    expect(result).toEqual({ segment: 'frequent', demotionStreak: 0 })
  })

  it('resets streak when staying at same level', () => {
    const result = applyHysteresis('returning', 'returning', 1)
    expect(result).toEqual({ segment: 'returning', demotionStreak: 0 })
  })
})

describe('distillActivitySegments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts summaries for users with session data', async () => {
    const now = new Date()
    vi.useFakeTimers()
    vi.setSystemTime(now)

    mockedPrisma.$queryRaw.mockResolvedValue([
      { userId: 'user1', activeDays28: 10, sessions28: 20, lastSessionAt: daysAgo(1, now) },
    ])
    mockedPrisma.userActivitySummary.findUnique.mockResolvedValue({
      userId: 'user1',
      firstSeenAt: daysAgo(30, now),
      lastSeenAt: daysAgo(2, now),
      activeDays28: 8,
      sessions28: 15,
      segment: 'returning',
      demotionStreak: 0,
      segmentUpdatedAt: daysAgo(1, now),
    })
    mockedPrisma.userActivitySummary.upsert.mockResolvedValue({} as any)
    mockedPrisma.userActivitySummary.updateMany.mockResolvedValue({ count: 0 })
    mockedPrisma.userSessionLog.deleteMany.mockResolvedValue({ count: 0 })

    await distillActivitySegments()

    expect(mockedPrisma.userActivitySummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user1' },
        update: expect.objectContaining({
          activeDays28: 10,
          sessions28: 20,
          segment: 'frequent', // promoted from returning (10 active days >= 8)
          demotionStreak: 0,
        }),
      })
    )

    vi.useRealTimers()
  })

  it('runs dormant sweep for stale summaries', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([])
    mockedPrisma.userActivitySummary.updateMany.mockResolvedValue({ count: 2 })
    mockedPrisma.userSessionLog.deleteMany.mockResolvedValue({ count: 0 })

    await distillActivitySegments()

    expect(mockedPrisma.userActivitySummary.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          segment: { not: 'dormant' },
        }),
        data: expect.objectContaining({
          segment: 'dormant',
          demotionStreak: 0,
        }),
      })
    )
  })

  it('cleans up old session logs', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([])
    mockedPrisma.userActivitySummary.updateMany.mockResolvedValue({ count: 0 })
    mockedPrisma.userSessionLog.deleteMany.mockResolvedValue({ count: 5 })

    await distillActivitySegments()

    expect(mockedPrisma.userSessionLog.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { startedAt: { lt: expect.any(Date) } },
      })
    )
  })
})
