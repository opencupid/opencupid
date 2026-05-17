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

import { prisma } from '../../lib/prisma'
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
  describe('clear-unvetted-window (trust-sweep)', () => {
    it('phase 1: clears aged PROFILE_UNVETTED flags conditionally', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([
        { id: 'f1', profileId: 'p1' },
        { id: 'f2', profileId: 'p2' },
      ] as any)
      vi.mocked(prisma.profileTrustFlag.updateMany).mockResolvedValue({ count: 1 } as any)
      vi.mocked(prisma.profile.findMany).mockResolvedValue([] as any)

      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))

      expect(prisma.profileTrustFlag.updateMany).toHaveBeenCalledTimes(2)
      expect(prisma.profileTrustFlag.updateMany).toHaveBeenCalledWith({
        where: { id: 'f1', clearedAt: null },
        data: { clearedAt: expect.any(Date), clearedBy: 'system:unvetted_window' },
      })
      expect(prisma.profileTrustFlag.updateMany).toHaveBeenCalledWith({
        where: { id: 'f2', clearedAt: null },
        data: { clearedAt: expect.any(Date), clearedBy: 'system:unvetted_window' },
      })
    })

    it('phase 1: clear write is conditional on clearedAt:null (preserves admin attribution on race)', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([
        { id: 'f1', profileId: 'p1' },
      ] as any)
      // count=0 simulates "admin already cleared this flag between findMany and update"
      vi.mocked(prisma.profileTrustFlag.updateMany).mockResolvedValue({ count: 0 } as any)
      vi.mocked(prisma.profile.findMany).mockResolvedValue([] as any)

      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))

      expect(prisma.profileTrustFlag.updateMany).toHaveBeenCalledWith({
        where: { id: 'f1', clearedAt: null },
        data: { clearedAt: expect.any(Date), clearedBy: 'system:unvetted_window' },
      })
    })

    it('phase 1: no longer enqueues anything (sweeper-only release)', async () => {
      // The promote-pendings BullMQ queue kind has been deleted; phase 1 just
      // clears flags. Phase 2 (sweep) handles release.
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([
        { id: 'f1', profileId: 'p1' },
      ] as any)
      vi.mocked(prisma.profileTrustFlag.updateMany).mockResolvedValue({ count: 1 } as any)
      vi.mocked(prisma.profile.findMany).mockResolvedValue([] as any)

      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))

      // phase 2 candidate scan happened but returned empty
      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            trustFlags: { none: { clearedAt: null } },
            Conversation: { some: { status: 'PENDING' } },
          },
        })
      )
      expect(promotePendingsIfClear).not.toHaveBeenCalled()
    })

    it('phase 2: sweeps profiles with no active flags + initiator-side PENDING', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.profile.findMany).mockResolvedValue([{ id: 'p1' }, { id: 'p2' }] as any)

      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))

      expect(promotePendingsIfClear).toHaveBeenCalledTimes(2)
      expect(promotePendingsIfClear).toHaveBeenCalledWith('p1')
      expect(promotePendingsIfClear).toHaveBeenCalledWith('p2')
    })

    it('phase 2: SQL anti-join filters out profiles with any active flag', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.profile.findMany).mockResolvedValue([] as any)

      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))

      expect(prisma.profile.findMany).toHaveBeenCalledWith({
        where: {
          trustFlags: { none: { clearedAt: null } },
          Conversation: { some: { status: 'PENDING' } },
        },
        select: { id: true },
      })
    })

    it('skips both phases when nothing is aged and no sweep candidates exist', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.profile.findMany).mockResolvedValue([] as any)
      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))
      expect(prisma.profileTrustFlag.updateMany).not.toHaveBeenCalled()
      expect(promotePendingsIfClear).not.toHaveBeenCalled()
    })

    it('excludes admin-set flags from phase 1', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.profile.findMany).mockResolvedValue([] as any)
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

    it('phase 1 continues when one flag clear fails', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([
        { id: 'f1', profileId: 'p1' },
        { id: 'f2', profileId: 'p2' },
      ] as any)
      vi.mocked(prisma.profileTrustFlag.updateMany)
        .mockRejectedValueOnce(new Error('db blip'))
        .mockResolvedValueOnce({ count: 1 } as any)
      vi.mocked(prisma.profile.findMany).mockResolvedValue([] as any)

      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))

      expect(prisma.profileTrustFlag.updateMany).toHaveBeenCalledTimes(2)
    })

    it('phase 2 continues when one profile promote fails', async () => {
      vi.mocked(prisma.profileTrustFlag.findMany).mockResolvedValue([] as any)
      vi.mocked(prisma.profile.findMany).mockResolvedValue([{ id: 'p1' }, { id: 'p2' }] as any)
      promotePendingsIfClear
        .mockRejectedValueOnce(new Error('40001 serializable conflict'))
        .mockResolvedValueOnce(undefined)

      await processProfileTrustJob(mockJob<ProfileTrustJobData>({ kind: 'clear-unvetted-window' }))

      expect(promotePendingsIfClear).toHaveBeenCalledTimes(2)
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
