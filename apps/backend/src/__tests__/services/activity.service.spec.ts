import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    profileSessionLog: {
      create: vi.fn(),
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

  it('skips the DB write when the NX claim is held by a prior request', async () => {
    const redis = makeRedis(null)

    await recordActivity(redis, 'profile-1')

    expect(mockedPrisma.profileSessionLog.create).not.toHaveBeenCalled()
  })

  it('swallows P2003 (deleted profile)', async () => {
    const { Prisma } = await import('@prisma/client')
    const redis = makeRedis('1')
    const fkErr = new Prisma.PrismaClientKnownRequestError('FK', {
      code: 'P2003',
      clientVersion: '5.0.0',
    })
    mockedPrisma.profileSessionLog.create.mockRejectedValueOnce(fkErr)

    await expect(recordActivity(redis, 'profile-1')).resolves.not.toThrow()
  })

  it('rethrows non-P2003 Prisma errors', async () => {
    const redis = makeRedis('1')
    mockedPrisma.profileSessionLog.create.mockRejectedValueOnce(new Error('boom'))

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

    expect(mockedPrisma.profileSessionLog.create).toHaveBeenCalledTimes(1)
  })
})
