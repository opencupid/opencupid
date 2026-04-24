import { describe, it, beforeEach, expect, vi } from 'vitest'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    profile: {
      findMany: vi.fn(),
    },
    profileAbuseFlag: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../../queues/abuseCheckQueue', () => ({}))

import type { Job } from 'bullmq'
import { prisma } from '../../lib/prisma'
import { AbuseCheckService } from '../../services/abuseCheck.service'
import { processAbuseCheckJob } from '../../workers/abuseCheckWorker'
import type { AbuseCheckJobData } from '../../queues/abuseCheckQueue'

const mockedPrisma = vi.mocked(prisma, true)

function mockJob<T>(data: T): Job<T> {
  return { data, log: vi.fn() } as unknown as Job<T>
}

describe('processAbuseCheckJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the singleton so each test sees a fresh service instance.
    ;(AbuseCheckService as any).instance = null
  })

  it('reconcile-one: reconciles only the named profile', async () => {
    const spy = vi
      .spyOn(AbuseCheckService.prototype, 'reconcileSpamBurst')
      .mockResolvedValue(undefined)

    await processAbuseCheckJob(
      mockJob<AbuseCheckJobData>({ kind: 'reconcile-one', profileId: 'p1' })
    )

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('p1')
    spy.mockRestore()
  })

  it('reconcile-many (default): iterates only currently-flagged profiles', async () => {
    mockedPrisma.profile.findMany.mockResolvedValue([{ id: 'flagged-1' }] as any)

    const spy = vi
      .spyOn(AbuseCheckService.prototype, 'reconcileSpamBurst')
      .mockResolvedValue(undefined)

    await processAbuseCheckJob(mockJob<AbuseCheckJobData>({ kind: 'reconcile-many' }))

    expect(mockedPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { abuseFlags: { some: { clearedAt: null } } },
      })
    )
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('flagged-1')
    spy.mockRestore()
  })

  it('reconcile-many (allProfiles=true): iterates all active profiles', async () => {
    mockedPrisma.profile.findMany.mockResolvedValue([{ id: 'active-1' }, { id: 'active-2' }] as any)

    const spy = vi
      .spyOn(AbuseCheckService.prototype, 'reconcileSpamBurst')
      .mockResolvedValue(undefined)

    await processAbuseCheckJob(
      mockJob<AbuseCheckJobData>({ kind: 'reconcile-many', allProfiles: true })
    )

    expect(mockedPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    )
    const calledWith = spy.mock.calls.map((c) => c[0]).sort()
    expect(calledWith).toEqual(['active-1', 'active-2'])
    spy.mockRestore()
  })

  it('reconcile-many (default): no-ops when no flagged profiles exist', async () => {
    mockedPrisma.profile.findMany.mockResolvedValue([])

    const spy = vi
      .spyOn(AbuseCheckService.prototype, 'reconcileSpamBurst')
      .mockResolvedValue(undefined)

    const job = mockJob<AbuseCheckJobData>({ kind: 'reconcile-many' })
    await processAbuseCheckJob(job)

    expect(spy).not.toHaveBeenCalled()
    expect(job.log).toHaveBeenCalledWith('reconciled 0 profile(s)')
    spy.mockRestore()
  })

  it('reconcile-many: logs and continues when one reconcile throws', async () => {
    mockedPrisma.profile.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }] as any)

    const spy = vi.spyOn(AbuseCheckService.prototype, 'reconcileSpamBurst')
    spy.mockRejectedValueOnce(new Error('simulated DB blip')) // first call fails
    spy.mockResolvedValueOnce(undefined) // second call succeeds

    const job = mockJob<AbuseCheckJobData>({ kind: 'reconcile-many' })
    await processAbuseCheckJob(job) // must not throw

    expect(spy).toHaveBeenCalledTimes(2)
    expect(job.log).toHaveBeenCalledWith(expect.stringContaining('failed to reconcile'))
    expect(job.log).toHaveBeenCalledWith('reconciled 1 profile(s) (1 failed)')
    spy.mockRestore()
  })
})
