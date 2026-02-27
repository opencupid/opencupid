import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock prisma
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

function createMockRedis() {
  return {
    get: vi.fn(),
    set: vi.fn(),
  }
}

let redis: ReturnType<typeof createMockRedis>

beforeEach(() => {
  vi.clearAllMocks()
  redis = createMockRedis()
  mockedPrisma.profileSessionLog.create.mockResolvedValue({} as any)
  redis.set.mockResolvedValue('OK')
})

describe('recordActivity', () => {
  it('creates a new session when no Redis key exists', async () => {
    redis.get.mockResolvedValue(null)

    await recordActivity(redis as any, 'profile1')

    expect(mockedPrisma.profileSessionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ profileId: 'profile1' }),
      })
    )
    expect(redis.set).toHaveBeenCalledWith(
      'activity:last:profile1',
      expect.any(String),
      'EX',
      86400
    )
  })

  it('skips when Redis key is fresh (within gap)', async () => {
    // Last activity 10 minutes ago (well within 30-min gap)
    const tenMinutesAgo = String(Date.now() - 10 * 60 * 1000)
    redis.get.mockResolvedValue(tenMinutesAgo)

    await recordActivity(redis as any, 'profile1')

    expect(mockedPrisma.profileSessionLog.create).not.toHaveBeenCalled()
    expect(redis.set).not.toHaveBeenCalled()
  })

  it('creates a new session when Redis key is stale (beyond gap)', async () => {
    // Last activity 35 minutes ago (beyond 30-min gap)
    const thirtyFiveMinutesAgo = String(Date.now() - 35 * 60 * 1000)
    redis.get.mockResolvedValue(thirtyFiveMinutesAgo)

    await recordActivity(redis as any, 'profile1')

    expect(mockedPrisma.profileSessionLog.create).toHaveBeenCalled()
    expect(redis.set).toHaveBeenCalled()
  })
})
