import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    profileSessionLog: {
      create: vi.fn(),
    },
    profileActivitySummary: {
      upsert: vi.fn(),
    },
  },
}))

import { recordActivity } from '../../services/activity.service'
import { prisma } from '../../lib/prisma'

const mockedPrisma = vi.mocked(prisma, true)

function makeRedis(setReturn: '1' | null) {
  return { set: vi.fn().mockResolvedValue(setReturn) } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedPrisma.profileSessionLog.create.mockResolvedValue({} as any)
  mockedPrisma.profileActivitySummary.upsert.mockResolvedValue({} as any)
  // Batch form: resolve the queued operations like Prisma does.
  mockedPrisma.$transaction.mockImplementation(((ops: Promise<unknown>[]) =>
    Promise.all(ops)) as any)
})

describe('recordActivity', () => {
  it('writes a session log when the NX claim wins', async () => {
    const redis = makeRedis('1')

    await recordActivity(redis, 'profile-1')

    expect(redis.set).toHaveBeenCalledWith('activity:last:profile-1', '1', 'EX', 30 * 60, 'NX')
    expect(mockedPrisma.profileSessionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ profileId: 'profile-1' }) })
    )
  })

  it('moves lastSeenAt to the session start in the same transaction', async () => {
    const redis = makeRedis('1')

    await recordActivity(redis, 'profile-1')

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1)
    const startedAt = mockedPrisma.profileSessionLog.create.mock.calls[0][0].data.startedAt
    expect(mockedPrisma.profileActivitySummary.upsert).toHaveBeenCalledWith({
      where: { profileId: 'profile-1' },
      create: {
        profileId: 'profile-1',
        firstSeenAt: startedAt,
        lastSeenAt: startedAt,
        segment: 'new',
      },
      update: { lastSeenAt: startedAt },
    })
  })

  it('skips the DB write when the NX claim is held by a prior request', async () => {
    const redis = makeRedis(null)

    await recordActivity(redis, 'profile-1')

    expect(mockedPrisma.$transaction).not.toHaveBeenCalled()
    expect(mockedPrisma.profileSessionLog.create).not.toHaveBeenCalled()
    expect(mockedPrisma.profileActivitySummary.upsert).not.toHaveBeenCalled()
  })

  it('swallows P2003 (deleted profile)', async () => {
    const { Prisma } = await import('@prisma/client')
    const redis = makeRedis('1')
    const fkErr = new Prisma.PrismaClientKnownRequestError('FK', {
      code: 'P2003',
      clientVersion: '5.0.0',
    })
    mockedPrisma.$transaction.mockRejectedValueOnce(fkErr)

    await expect(recordActivity(redis, 'profile-1')).resolves.not.toThrow()
  })

  it('rethrows non-P2003 Prisma errors', async () => {
    const redis = makeRedis('1')
    mockedPrisma.$transaction.mockRejectedValueOnce(new Error('boom'))

    await expect(recordActivity(redis, 'profile-1')).rejects.toThrow('boom')
  })

  it('dedupes concurrent requests: only the NX winner writes', async () => {
    // Simulate Redis NX semantics: first caller wins, subsequent calls within
    // the TTL window get null.
    let claimed = false
    const redis = {
      set: vi.fn().mockImplementation(async () => {
        if (claimed) return null
        claimed = true
        return '1'
      }),
    } as any

    await Promise.all(Array.from({ length: 20 }, () => recordActivity(redis, 'profile-1')))

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1)
    expect(mockedPrisma.profileActivitySummary.upsert).toHaveBeenCalledTimes(1)
  })
})
