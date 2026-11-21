import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock prisma before imports
vi.mock('../../lib/prisma', () => {
  const mock: any = {
    $queryRaw: vi.fn(),
    profileActivitySummary: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    profileSessionLog: {
      deleteMany: vi.fn(),
    },
  }
  mock.$transaction = vi.fn((fn: (client: any) => any) => fn(mock))
  return { prisma: mock }
})

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
  const newAccount = daysAgo(3, now)
  const oldAccount = daysAgo(400, now)

  it('returns dormant when lastSeenAt is 14+ days ago', () => {
    expect(computeRawSegment(daysAgo(14, now), 5, oldAccount, now)).toBe('dormant')
  })

  it('returns dormant when lastSeenAt is 20 days ago even with high activeDays', () => {
    expect(computeRawSegment(daysAgo(20, now), 15, oldAccount, now)).toBe('dormant')
  })

  it('returns dormant for a new account not seen in 14+ days', () => {
    expect(computeRawSegment(daysAgo(14, now), 1, daysAgo(20, now), now)).toBe('dormant')
  })

  it('returns frequent when activeDays28 >= 8', () => {
    expect(computeRawSegment(daysAgo(0, now), 8, newAccount, now)).toBe('frequent')
  })

  it('returns returning when activeDays28 >= 2 and < 8', () => {
    expect(computeRawSegment(daysAgo(1, now), 4, newAccount, now)).toBe('returning')
  })

  it('returns returning at the threshold of 2 active days', () => {
    expect(computeRawSegment(daysAgo(0, now), 2, newAccount, now)).toBe('returning')
  })

  it('returns new for a recent account with a single active day', () => {
    expect(computeRawSegment(daysAgo(0, now), 1, newAccount, now)).toBe('new')
  })

  it('returns new up to an account age just under 28 days', () => {
    expect(computeRawSegment(daysAgo(0, now), 1, daysAgo(27.9, now), now)).toBe('new')
  })

  it('returns returning for an account of 28+ days active on a single day (back from dormant)', () => {
    expect(computeRawSegment(daysAgo(0, now), 1, daysAgo(28, now), now)).toBe('returning')
    expect(computeRawSegment(daysAgo(0, now), 1, oldAccount, now)).toBe('returning')
  })

  it('dormant overrides frequent (priority)', () => {
    expect(computeRawSegment(daysAgo(15, now), 12, oldAccount, now)).toBe('dormant')
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

  it('upserts summaries for profiles with session data', async () => {
    const now = new Date()
    vi.useFakeTimers()
    vi.setSystemTime(now)

    mockedPrisma.$queryRaw.mockResolvedValue([
      {
        profileId: 'profile1',
        activeDays28: 10,
        sessions28: 20,
        lastSessionAt: daysAgo(1, now),
        accountCreatedAt: daysAgo(60, now),
      },
    ])
    mockedPrisma.profileActivitySummary.findUnique.mockResolvedValue({
      profileId: 'profile1',
      lastSeenAt: daysAgo(2, now),
      activeDays28: 8,
      sessions28: 15,
      segment: 'returning',
      demotionStreak: 0,
      segmentUpdatedAt: daysAgo(1, now),
    })
    mockedPrisma.profileActivitySummary.upsert.mockResolvedValue({} as any)
    mockedPrisma.profileActivitySummary.updateMany.mockResolvedValue({ count: 0 })
    mockedPrisma.profileSessionLog.deleteMany.mockResolvedValue({ count: 0 })

    await distillActivitySegments()

    expect(mockedPrisma.profileActivitySummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: 'profile1' },
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

  it('leaves lastSeenAt to recordActivity and reads it for the segment', async () => {
    const now = new Date()
    vi.useFakeTimers()
    vi.setSystemTime(now)

    // The session log's newest row is older than the live lastSeenAt; the
    // distill must neither overwrite nor ignore the stored value.
    mockedPrisma.$queryRaw.mockResolvedValue([
      {
        profileId: 'profile1',
        activeDays28: 1,
        sessions28: 1,
        lastSessionAt: daysAgo(20, now),
        accountCreatedAt: daysAgo(25, now),
      },
    ])
    mockedPrisma.profileActivitySummary.findUnique.mockResolvedValue({
      profileId: 'profile1',
      lastSeenAt: daysAgo(0, now),
      activeDays28: 1,
      sessions28: 1,
      segment: 'new',
      demotionStreak: 0,
      segmentUpdatedAt: daysAgo(1, now),
    })
    mockedPrisma.profileActivitySummary.upsert.mockResolvedValue({} as any)
    mockedPrisma.profileActivitySummary.updateMany.mockResolvedValue({ count: 0 })
    mockedPrisma.profileSessionLog.deleteMany.mockResolvedValue({ count: 0 })

    await distillActivitySegments()

    const args = mockedPrisma.profileActivitySummary.upsert.mock.calls[0][0]
    expect(args.update).not.toHaveProperty('lastSeenAt')
    // Seen today per the stored lastSeenAt, so not dormant despite the 20-day-old session.
    expect(args.update).toEqual(expect.objectContaining({ segment: 'new' }))

    vi.useRealTimers()
  })

  it('processes multiple profiles in a single batch', async () => {
    const now = new Date()
    vi.useFakeTimers()
    vi.setSystemTime(now)

    mockedPrisma.$queryRaw.mockResolvedValue([
      {
        profileId: 'profile1',
        activeDays28: 10,
        sessions28: 20,
        lastSessionAt: daysAgo(1, now),
        accountCreatedAt: daysAgo(60, now),
      },
      {
        profileId: 'profile2',
        activeDays28: 3,
        sessions28: 5,
        lastSessionAt: daysAgo(0, now),
        accountCreatedAt: daysAgo(5, now),
      },
      {
        profileId: 'profile3',
        activeDays28: 1,
        sessions28: 1,
        lastSessionAt: daysAgo(0, now),
        accountCreatedAt: daysAgo(1, now),
      },
    ])
    // profile1: existing frequent profile
    // profile2: no existing summary, 3 active days → returning
    // profile3: no existing summary, 1 active day → new
    mockedPrisma.profileActivitySummary.findUnique
      .mockResolvedValueOnce({
        profileId: 'profile1',
        lastSeenAt: daysAgo(2, now),
        activeDays28: 8,
        sessions28: 15,
        segment: 'frequent',
        demotionStreak: 0,
        segmentUpdatedAt: daysAgo(1, now),
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    mockedPrisma.profileActivitySummary.upsert.mockResolvedValue({} as any)
    mockedPrisma.profileActivitySummary.updateMany.mockResolvedValue({ count: 0 })
    mockedPrisma.profileSessionLog.deleteMany.mockResolvedValue({ count: 0 })

    await distillActivitySegments()

    // All three profiles should have been upserted
    expect(mockedPrisma.profileActivitySummary.upsert).toHaveBeenCalledTimes(3)

    // profile1: stays frequent (10 active days >= 8)
    expect(mockedPrisma.profileActivitySummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: 'profile1' },
        update: expect.objectContaining({ segment: 'frequent' }),
      })
    )
    // profile2: returning (3 active days >= 2 threshold, no existing summary → default dormant, promoted)
    expect(mockedPrisma.profileActivitySummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: 'profile2' },
        create: expect.objectContaining({ segment: 'returning' }),
      })
    )
    // profile3: new (1 active day < 2 threshold, promoted from dormant)
    expect(mockedPrisma.profileActivitySummary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: 'profile3' },
        create: expect.objectContaining({ segment: 'new' }),
      })
    )

    vi.useRealTimers()
  })

  describe('account age (Profile.createdAt)', () => {
    const now = new Date('2026-11-17T03:00:00Z')

    function summary(segment: 'dormant' | 'returning', lastSeenAt: Date) {
      return {
        profileId: 'p1',
        lastSeenAt,
        activeDays28: 0,
        sessions28: 0,
        segment,
        demotionStreak: 0,
        segmentUpdatedAt: daysAgo(100, now),
      }
    }

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(now)
      mockedPrisma.profileActivitySummary.upsert.mockResolvedValue({} as any)
      mockedPrisma.profileActivitySummary.updateMany.mockResolvedValue({ count: 0 })
      mockedPrisma.profileSessionLog.deleteMany.mockResolvedValue({ count: 0 })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('reads the account creation time from Profile', async () => {
      mockedPrisma.$queryRaw.mockResolvedValue([])
      await distillActivitySegments()
      const sql = (mockedPrisma.$queryRaw.mock.calls[0][0] as unknown as string[]).join('')
      expect(sql).toContain('JOIN "Profile" p')
      expect(sql).toContain('p."createdAt" AS "accountCreatedAt"')
    })

    it('promotes a dormant old account that comes back for one day straight to returning', async () => {
      mockedPrisma.$queryRaw.mockResolvedValue([
        {
          profileId: 'p1',
          activeDays28: 1,
          sessions28: 2,
          lastSessionAt: daysAgo(0.1, now),
          accountCreatedAt: daysAgo(480, now),
        },
      ])
      // Still dormant, but recordActivity already moved lastSeenAt to the visit.
      mockedPrisma.profileActivitySummary.findUnique.mockResolvedValue(
        summary('dormant', daysAgo(0.1, now))
      )

      await distillActivitySegments()

      expect(mockedPrisma.profileActivitySummary.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ segment: 'returning', demotionStreak: 0 }),
        })
      )
    })

    it('keeps an old returning account at returning when its active days drop to 1', async () => {
      mockedPrisma.$queryRaw.mockResolvedValue([
        {
          profileId: 'p1',
          activeDays28: 1,
          sessions28: 1,
          lastSessionAt: daysAgo(10, now),
          accountCreatedAt: daysAgo(230, now),
        },
      ])
      mockedPrisma.profileActivitySummary.findUnique.mockResolvedValue(
        summary('returning', daysAgo(10, now))
      )

      await distillActivitySegments()

      expect(mockedPrisma.profileActivitySummary.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ segment: 'returning', demotionStreak: 0 }),
        })
      )
    })

    it('no longer writes firstSeenAt', async () => {
      mockedPrisma.$queryRaw.mockResolvedValue([
        {
          profileId: 'p1',
          activeDays28: 1,
          sessions28: 1,
          lastSessionAt: daysAgo(0, now),
          accountCreatedAt: daysAgo(0, now),
        },
      ])
      mockedPrisma.profileActivitySummary.findUnique.mockResolvedValue(null)

      await distillActivitySegments()

      const args = mockedPrisma.profileActivitySummary.upsert.mock.calls[0][0]
      expect(args.create).not.toHaveProperty('firstSeenAt')
      expect(args.create).toEqual(expect.objectContaining({ segment: 'new' }))
    })
  })

  it('runs dormant sweep for stale summaries', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([])
    mockedPrisma.profileActivitySummary.updateMany.mockResolvedValue({ count: 2 })
    mockedPrisma.profileSessionLog.deleteMany.mockResolvedValue({ count: 0 })

    await distillActivitySegments()

    expect(mockedPrisma.profileActivitySummary.updateMany).toHaveBeenCalledWith(
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
    mockedPrisma.profileActivitySummary.updateMany.mockResolvedValue({ count: 0 })
    mockedPrisma.profileSessionLog.deleteMany.mockResolvedValue({ count: 5 })

    await distillActivitySegments()

    expect(mockedPrisma.profileSessionLog.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { startedAt: { lt: expect.any(Date) } },
      })
    )
  })
})
