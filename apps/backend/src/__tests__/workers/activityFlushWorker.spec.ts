import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    profileSessionLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('../../queues/activityFlushQueue', () => ({
  activityFlushQueue: {},
  enqueueActivity: vi.fn(),
}))

import { processActivityFlushJob } from '../../workers/activityFlushWorker'
import { prisma } from '../../lib/prisma'

const mockedPrisma = vi.mocked(prisma, true)

const SESSION_GAP_MS = 30 * 60 * 1000

beforeEach(() => {
  vi.clearAllMocks()
  mockedPrisma.profileSessionLog.create.mockResolvedValue({} as any)
})

describe('processActivityFlushJob', () => {
  it('creates a session log when no prior log exists', async () => {
    mockedPrisma.profileSessionLog.findFirst.mockResolvedValue(null)

    await processActivityFlushJob('profile-1')

    expect(mockedPrisma.profileSessionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ profileId: 'profile-1' }),
      })
    )
  })

  it('creates a session log when last log is older than 30 minutes', async () => {
    const oldDate = new Date(Date.now() - SESSION_GAP_MS - 1000)
    mockedPrisma.profileSessionLog.findFirst.mockResolvedValue({
      startedAt: oldDate,
    } as any)

    await processActivityFlushJob('profile-1')

    expect(mockedPrisma.profileSessionLog.create).toHaveBeenCalled()
  })

  it('skips when last log is within 30 minutes', async () => {
    const recentDate = new Date(Date.now() - 10 * 60 * 1000)
    mockedPrisma.profileSessionLog.findFirst.mockResolvedValue({
      startedAt: recentDate,
    } as any)

    await processActivityFlushJob('profile-1')

    expect(mockedPrisma.profileSessionLog.create).not.toHaveBeenCalled()
  })

  it('silently skips FK violation (deleted profile)', async () => {
    const { Prisma } = await import('@prisma/client')
    mockedPrisma.profileSessionLog.findFirst.mockResolvedValue(null)
    const fkError = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '5.0.0',
    })
    mockedPrisma.profileSessionLog.create.mockRejectedValueOnce(fkError)

    await expect(processActivityFlushJob('profile-1')).resolves.not.toThrow()
    expect(mockedPrisma.profileSessionLog.create).toHaveBeenCalled()
  })
})
