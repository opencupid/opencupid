import { describe, it, beforeEach, expect, vi } from 'vitest'
import type { Job } from 'bullmq'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    profileTrustFlag: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    profile: {
      findMany: vi.fn(),
    },
  },
}))
vi.mock('../../queues/profileTrustQueue', () => ({
  profileTrustQueue: { add: vi.fn() },
}))

import { prisma } from '../../lib/prisma'
import { profileTrustQueue } from '../../queues/profileTrustQueue'
import { ProfileTrustService } from '../../services/profileTrust.service'
import { processProfileTrustJob } from '../../workers/profileTrustWorker'
import type { ProfileTrustJobData } from '../../queues/profileTrustQueue'

function mockJob<T>(data: T): Job<T> {
  return { data, log: vi.fn() } as unknown as Job<T>
}

const reconcileSpamBurst = vi.spyOn(ProfileTrustService.prototype, 'reconcileSpamBurst')
const promotePendingsIfClear = vi.spyOn(ProfileTrustService.prototype, 'promotePendingsIfClear')

beforeEach(() => {
  vi.clearAllMocks()
  reconcileSpamBurst.mockResolvedValue(undefined)
  promotePendingsIfClear.mockResolvedValue(undefined)
  ;(ProfileTrustService as any).instance = null
})

describe('processProfileTrustJob', () => {
  describe('promote-pendings', () => {
    it('calls promotePendingsIfClear with the payload profileId', async () => {
      await processProfileTrustJob(
        mockJob<ProfileTrustJobData>({ kind: 'promote-pendings', profileId: 'p1' })
      )
      expect(promotePendingsIfClear).toHaveBeenCalledTimes(1)
      expect(promotePendingsIfClear).toHaveBeenCalledWith('p1')
    })
  })

  describe('clear-unvetted-window', () => {
    it('clears aged PROFILE_UNVETTED flags and enqueues promote-pendings per profile', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([
        { id: 'f1', profileId: 'p1' },
        { id: 'f2', profileId: 'p2' },
      ] as any)
      vi.mocked(profileTrustQueue.add).mockResolvedValue({} as any)
      vi.mocked(prisma.profileTrustFlag.updateMany).mockResolvedValue({ count: 1 } as any)

      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))

      expect(prisma.profileTrustFlag.updateMany).toHaveBeenCalledTimes(2)
      expect(profileTrustQueue.add).toHaveBeenCalledTimes(2)
      expect(profileTrustQueue.add).toHaveBeenCalledWith(
        'promote-pendings',
        { kind: 'promote-pendings', profileId: 'p1' },
        expect.objectContaining({ jobId: 'promote-pendings-p1' })
      )
      expect(profileTrustQueue.add).toHaveBeenCalledWith(
        'promote-pendings',
        { kind: 'promote-pendings', profileId: 'p2' },
        expect.objectContaining({ jobId: 'promote-pendings-p2' })
      )
    })

    it('clear write is conditional on clearedAt:null (preserves attribution if admin won the race)', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([
        { id: 'f1', profileId: 'p1' },
      ] as any)
      vi.mocked(profileTrustQueue.add).mockResolvedValue({} as any)
      // count=0 simulates "admin already cleared this flag between findMany and update"
      vi.mocked(prisma.profileTrustFlag.updateMany).mockResolvedValue({ count: 0 } as any)

      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))

      // updateMany was issued with the race-safety guard.
      expect(prisma.profileTrustFlag.updateMany).toHaveBeenCalledWith({
        where: { id: 'f1', clearedAt: null },
        data: { clearedAt: expect.any(Date), clearedBy: 'system:unvetted_window' },
      })
      // The 0-row outcome is not treated as a failure — no throw, loop continues.
    })

    it('skips the scan when nothing is aged', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([] as any)
      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))
      expect(prisma.profileTrustFlag.updateMany).not.toHaveBeenCalled()
      expect(profileTrustQueue.add).not.toHaveBeenCalled()
    })

    it('excludes admin-set flags from the auto-clear scan', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([] as any)
      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))
      expect(prisma.profileTrustFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reason: 'PROFILE_UNVETTED',
            clearedAt: null,
            flaggedBy: { not: { startsWith: 'admin:' } },
          }),
        })
      )
    })

    it('continues when one profile fails', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([
        { id: 'f1', profileId: 'p1' },
        { id: 'f2', profileId: 'p2' },
      ] as any)
      // With enqueue-before-update ordering, a failed enqueue on p1 short-circuits
      // the update for p1 (flag stays set, next scan retries). p2 proceeds normally.
      vi.mocked(profileTrustQueue.add)
        .mockRejectedValueOnce(new Error('redis blip'))
        .mockResolvedValueOnce({} as any)
      vi.mocked(prisma.profileTrustFlag.updateMany).mockResolvedValue({ count: 1 } as any)

      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))

      // Both profiles must be attempted (proves loop continues after failure).
      expect(profileTrustQueue.add).toHaveBeenCalledTimes(2)
      // Only p2 reached the update step (p1's update skipped by the thrown enqueue).
      expect(prisma.profileTrustFlag.updateMany).toHaveBeenCalledTimes(1)
      expect(prisma.profileTrustFlag.updateMany).toHaveBeenCalledWith({
        where: { id: 'f2', clearedAt: null },
        data: { clearedAt: expect.any(Date), clearedBy: 'system:unvetted_window' },
      })
    })
  })

  describe('reconcile-many', () => {
    it('default path iterates only profiles with active flags', async () => {
      vi.mocked(prisma.profile.findMany).mockResolvedValue([{ id: 'p1' }] as any)
      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'reconcile-many' }))
      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { trustFlags: { some: { clearedAt: null } } },
        })
      )
      expect(reconcileSpamBurst).toHaveBeenCalledWith('p1')
    })

    it('allProfiles=true iterates all active profiles', async () => {
      vi.mocked(prisma.profile.findMany).mockResolvedValue([{ id: 'p1' }, { id: 'p2' }] as any)
      await processProfileTrustJob(
        mockJob<ProfileTrustJobData>({ kind: 'reconcile-many', allProfiles: true })
      )
      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } })
      )
      expect(reconcileSpamBurst).toHaveBeenCalledTimes(2)
    })
  })
})
