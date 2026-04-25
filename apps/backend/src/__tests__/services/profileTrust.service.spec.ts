import { describe, it, beforeEach, expect, vi } from 'vitest'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    profileTrustFlag: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

const { promoteConversationMock } = vi.hoisted(() => ({
  promoteConversationMock: vi.fn(),
}))

vi.mock('@/services/messaging.service', () => ({
  MessageService: {
    getInstance: () => ({ promoteConversation: promoteConversationMock }),
  },
}))

import { prisma } from '../../lib/prisma'
import { ProfileTrustService } from '../../services/profileTrust.service'

const mockedFindFirst = vi.mocked(prisma.profileTrustFlag.findFirst)

let svc: ProfileTrustService

beforeEach(() => {
  vi.resetAllMocks()
  // Reset the singleton so each test sees a fresh service instance.
  ;(ProfileTrustService as any).instance = null
  svc = ProfileTrustService.getInstance()
})

describe('ProfileTrustService', () => {
  describe('hasTrustFlag (any reason)', () => {
    it('returns false when no active flag exists', async () => {
      mockedFindFirst.mockResolvedValue(null)
      expect(await svc.hasTrustFlag('profile-1')).toBe(false)
      expect(mockedFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ profileId: 'profile-1', clearedAt: null }),
        })
      )
    })

    it('returns true when an active flag exists', async () => {
      mockedFindFirst.mockResolvedValue({ id: 'flag-1' } as any)
      expect(await svc.hasTrustFlag('profile-1')).toBe(true)
    })

    it('does not add a reason filter when reason is omitted', async () => {
      mockedFindFirst.mockResolvedValue(null)
      await svc.hasTrustFlag('profile-1')
      const call = mockedFindFirst.mock.calls[0][0]
      expect((call!.where as any).reason).toBeUndefined()
    })
  })

  describe('hasTrustFlag (specific reason)', () => {
    it('adds a reason filter when reason is provided', async () => {
      mockedFindFirst.mockResolvedValue(null)
      await svc.hasTrustFlag('profile-1', 'SPAM_BURST')
      expect(mockedFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ reason: 'SPAM_BURST', clearedAt: null }),
        })
      )
    })
  })

  describe('reconcileSpamBurst', () => {
    // Mock conversation + profileTrustFlag + the queue
    const conversationCount = vi.fn()
    const conversationFindMany = vi.fn()
    const profileTrustFlagCreate = vi.fn()
    const profileTrustFlagUpdateMany = vi.fn()
    const conversationUpdateMany = vi.fn()
    const queueAdd = vi.fn()

    beforeEach(() => {
      ;(prisma as any).conversation = {
        count: conversationCount,
        findMany: conversationFindMany,
        updateMany: conversationUpdateMany,
      }
      ;(prisma as any).profileTrustFlag = {
        findFirst: mockedFindFirst,
        create: profileTrustFlagCreate,
        updateMany: profileTrustFlagUpdateMany,
      }
      vi.doMock('@/queues/profileTrustQueue', () => ({
        profileTrustQueue: { add: queueAdd },
      }))
      conversationCount.mockReset()
      conversationFindMany.mockReset()
      profileTrustFlagCreate.mockReset()
      profileTrustFlagUpdateMany.mockReset()
      conversationUpdateMany.mockReset()
      queueAdd.mockReset()
    })

    it('writes flag AND DISCARDs active (INITIATED+PENDING) when threshold reached and not already flagged', async () => {
      conversationCount.mockResolvedValue(3)
      conversationFindMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }])
      mockedFindFirst.mockResolvedValue(null) // hasTrustFlag returns false

      await svc.reconcileSpamBurst('profile-1')

      expect(profileTrustFlagCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          profileId: 'profile-1',
          reason: 'SPAM_BURST',
          evidence: { sampleConversationIds: ['c1', 'c2', 'c3'], countAtFlagTime: 3 },
          flaggedBy: 'heuristic:spam_burst',
        }),
      })
      expect(conversationUpdateMany).toHaveBeenCalledWith({
        where: {
          initiatorProfileId: 'profile-1',
          status: { in: ['INITIATED', 'PENDING'] },
        },
        data: { status: 'DISCARDED' },
      })
    })

    it('caps evidence sample size when count is large', async () => {
      // Abusive profile with 50 active conversations — sample must not include all 50.
      conversationCount.mockResolvedValue(50)
      conversationFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({ id: `c${i}` }))
      )
      mockedFindFirst.mockResolvedValue(null)

      await svc.reconcileSpamBurst('profile-1')

      // findMany must be called with take: 10 (the bounded sample).
      expect(conversationFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, select: { id: true } })
      )
      // Evidence carries the full count but only the sampled IDs.
      expect(profileTrustFlagCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          evidence: expect.objectContaining({
            countAtFlagTime: 50,
            sampleConversationIds: expect.any(Array),
          }),
        }),
      })
      const evidence = (profileTrustFlagCreate.mock.calls[0][0] as any).data.evidence
      expect(evidence.sampleConversationIds).toHaveLength(10)
    })

    it('DISCARDs race-survivors when at threshold and already flagged (convergence)', async () => {
      // Models the race: a send crossed the route's pre-tx hasTrustFlag check BEFORE
      // the flag landed, so when reconcile runs next, it sees count >= threshold AND
      // alreadyFlagged. The just-created INITIATED must still be DISCARDed.
      conversationCount.mockResolvedValue(3)
      mockedFindFirst.mockResolvedValue({ id: 'flag-1' } as any) // already flagged

      await svc.reconcileSpamBurst('profile-1')

      // No new flag written — idempotent.
      expect(profileTrustFlagCreate).not.toHaveBeenCalled()
      // No sample fetch when we don't write a flag — saves the bounded findMany.
      expect(conversationFindMany).not.toHaveBeenCalled()
      // But active-row DISCARD DOES run — this is the convergence guarantee.
      expect(conversationUpdateMany).toHaveBeenCalledWith({
        where: {
          initiatorProfileId: 'profile-1',
          status: { in: ['INITIATED', 'PENDING'] },
        },
        data: { status: 'DISCARDED' },
      })
      // Not in the clear branch.
      expect(profileTrustFlagUpdateMany).not.toHaveBeenCalled()
      expect(queueAdd).not.toHaveBeenCalled()
    })

    it('clears flag and enqueues promote-pendings when condition resolves', async () => {
      conversationCount.mockResolvedValue(1) // below threshold
      mockedFindFirst.mockResolvedValue({ id: 'flag-1' } as any) // currently flagged

      await svc.reconcileSpamBurst('profile-1')

      expect(profileTrustFlagUpdateMany).toHaveBeenCalledWith({
        where: { profileId: 'profile-1', reason: 'SPAM_BURST', clearedAt: null },
        data: { clearedAt: expect.any(Date), clearedBy: 'heuristic:spam_burst_below_threshold' },
      })
      expect(queueAdd).toHaveBeenCalledWith(
        'promote-pendings',
        { kind: 'promote-pendings', profileId: 'profile-1' },
        expect.objectContaining({ jobId: 'promote-pendings-profile-1' })
      )
      expect(profileTrustFlagCreate).not.toHaveBeenCalled()
      expect(conversationUpdateMany).not.toHaveBeenCalled()
    })

    it('no-ops when below threshold and not flagged', async () => {
      conversationCount.mockResolvedValue(1)
      mockedFindFirst.mockResolvedValue(null)

      await svc.reconcileSpamBurst('profile-1')

      expect(profileTrustFlagCreate).not.toHaveBeenCalled()
      expect(profileTrustFlagUpdateMany).not.toHaveBeenCalled()
      expect(queueAdd).not.toHaveBeenCalled()
      // No findMany either — count() alone settles the decision.
      expect(conversationFindMany).not.toHaveBeenCalled()
    })

    it('threshold-counting query includes both INITIATED and PENDING', async () => {
      conversationCount.mockResolvedValue(0)
      mockedFindFirst.mockResolvedValue(null)
      await svc.reconcileSpamBurst('profile-1')
      expect(conversationCount).toHaveBeenCalledWith({
        where: { initiatorProfileId: 'profile-1', status: { in: ['INITIATED', 'PENDING'] } },
      })
    })
  })

  describe('promotePendingsIfClear', () => {
    const transactionFn = vi.fn()
    const txFlagFindFirst = vi.fn()
    const txConversationFindMany = vi.fn()

    beforeEach(() => {
      ;(prisma as any).$transaction = transactionFn
      transactionFn.mockImplementation(async (cb: any) => {
        return cb({
          profileTrustFlag: { findFirst: txFlagFindFirst },
          conversation: { findMany: txConversationFindMany },
        })
      })
      txFlagFindFirst.mockReset()
      txConversationFindMany.mockReset()
      promoteConversationMock.mockReset()
    })

    it('no-ops when still flagged', async () => {
      txFlagFindFirst.mockResolvedValue({ id: 'flag-1' } as any)
      await svc.promotePendingsIfClear('profile-1')
      expect(txConversationFindMany).not.toHaveBeenCalled()
      expect(promoteConversationMock).not.toHaveBeenCalled()
    })

    it('promotes each PENDING with the correct recipient id (sender is profileA)', async () => {
      txFlagFindFirst.mockResolvedValue(null)
      txConversationFindMany.mockResolvedValue([
        { id: 'c1', profileAId: 'profile-1', profileBId: 'bob' },
        { id: 'c2', profileAId: 'profile-1', profileBId: 'carol' },
      ])
      await svc.promotePendingsIfClear('profile-1')
      expect(promoteConversationMock).toHaveBeenCalledTimes(2)
      expect(promoteConversationMock).toHaveBeenCalledWith(expect.anything(), 'c1', 'bob')
      expect(promoteConversationMock).toHaveBeenCalledWith(expect.anything(), 'c2', 'carol')
    })

    it('promotes with correct recipient when sender is profileB', async () => {
      txFlagFindFirst.mockResolvedValue(null)
      txConversationFindMany.mockResolvedValue([
        { id: 'c1', profileAId: 'alice', profileBId: 'profile-1' },
      ])
      await svc.promotePendingsIfClear('profile-1')
      expect(promoteConversationMock).toHaveBeenCalledWith(expect.anything(), 'c1', 'alice')
    })

    it('uses Serializable isolation level', async () => {
      txFlagFindFirst.mockResolvedValue(null)
      txConversationFindMany.mockResolvedValue([])
      await svc.promotePendingsIfClear('profile-1')
      expect(transactionFn).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: 'Serializable' })
      )
    })
  })

  describe('listTrustFlags', () => {
    const flagFindMany = vi.fn()
    const flagCount = vi.fn()

    beforeEach(() => {
      // Re-attach methods because the reconcileSpamBurst describe block
      // overwrites `prisma.profileTrustFlag` with a partial shape.
      ;(prisma as any).profileTrustFlag = {
        ...(prisma as any).profileTrustFlag,
        findMany: flagFindMany,
        count: flagCount,
      }
      flagFindMany.mockReset()
      flagCount.mockReset()
    })

    it('queries active flags by default, ordered by flaggedAt DESC, with profile join', async () => {
      flagFindMany.mockResolvedValue([])
      flagCount.mockResolvedValue(0)

      await svc.listTrustFlags({ page: 1, pageSize: 25 })

      expect(prisma.profileTrustFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clearedAt: null },
          orderBy: { flaggedAt: 'desc' },
          skip: 0,
          take: 25,
          include: expect.objectContaining({
            profile: { select: { id: true, publicName: true, country: true, cityName: true } },
          }),
        })
      )
      expect(prisma.profileTrustFlag.count).toHaveBeenCalledWith({ where: { clearedAt: null } })
    })

    it('includes cleared rows when activeOnly is false', async () => {
      flagFindMany.mockResolvedValue([])
      flagCount.mockResolvedValue(0)

      await svc.listTrustFlags({ page: 1, pageSize: 10, activeOnly: false })

      const call = flagFindMany.mock.calls[0][0] as any
      expect(call.where.clearedAt).toBeUndefined()
    })

    it('applies a reason filter when provided', async () => {
      flagFindMany.mockResolvedValue([])
      flagCount.mockResolvedValue(0)

      await svc.listTrustFlags({ page: 1, pageSize: 10, reason: 'SPAM_BURST' })

      const call = flagFindMany.mock.calls[0][0] as any
      expect(call.where.reason).toBe('SPAM_BURST')
    })

    it('paginates via skip/take', async () => {
      flagFindMany.mockResolvedValue([])
      flagCount.mockResolvedValue(0)

      await svc.listTrustFlags({ page: 3, pageSize: 25 })

      const call = flagFindMany.mock.calls[0][0] as any
      expect(call.skip).toBe(50)
      expect(call.take).toBe(25)
    })

    it('returns the queried flags and total count', async () => {
      const sample = [{ id: 'f1', profileId: 'p1' } as any]
      flagFindMany.mockResolvedValue(sample)
      flagCount.mockResolvedValue(7)

      const result = await svc.listTrustFlags({ page: 1, pageSize: 25 })

      expect(result.flags).toEqual(sample)
      expect(result.total).toBe(7)
    })
  })

  describe('clearFlag', () => {
    const flagFindUnique = vi.fn()
    const flagUpdate = vi.fn()
    const queueAdd = vi.fn()

    beforeEach(() => {
      ;(prisma as any).profileTrustFlag = {
        ...(prisma as any).profileTrustFlag,
        findUnique: flagFindUnique,
        update: flagUpdate,
      }
      vi.doMock('@/queues/profileTrustQueue', () => ({
        profileTrustQueue: { add: queueAdd },
      }))
      flagFindUnique.mockReset()
      flagUpdate.mockReset()
      queueAdd.mockReset()
    })

    it('writes clearedAt + clearedBy, enqueues promote-pendings, returns "cleared"', async () => {
      flagFindUnique.mockResolvedValue({
        id: 'f1',
        profileId: 'p1',
        clearedAt: null,
        flaggedBy: 'admin:manual',
      })
      flagUpdate.mockResolvedValue({})
      queueAdd.mockResolvedValue({})

      const result = await svc.clearFlag('f1', 'admin:manual')

      expect(result).toBe('cleared')
      expect(flagUpdate).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { clearedAt: expect.any(Date), clearedBy: 'admin:manual' },
      })
      expect(queueAdd).toHaveBeenCalledWith(
        'promote-pendings',
        { kind: 'promote-pendings', profileId: 'p1' },
        expect.objectContaining({ jobId: 'promote-pendings-p1' })
      )
    })

    it('returns "not_found" when the flag is missing', async () => {
      flagFindUnique.mockResolvedValue(null)
      expect(await svc.clearFlag('missing', 'admin:manual')).toBe('not_found')
      expect(flagUpdate).not.toHaveBeenCalled()
    })

    it('returns "already_cleared" when the flag is already cleared', async () => {
      flagFindUnique.mockResolvedValue({
        id: 'f1',
        profileId: 'p1',
        clearedAt: new Date(),
        flaggedBy: 'admin:manual',
      })
      expect(await svc.clearFlag('f1', 'admin:manual')).toBe('already_cleared')
      expect(flagUpdate).not.toHaveBeenCalled()
    })

    it('returns "non_admin" when the flag is heuristic-set', async () => {
      flagFindUnique.mockResolvedValue({
        id: 'f1',
        profileId: 'p1',
        clearedAt: null,
        flaggedBy: 'heuristic:spam_burst',
      })
      expect(await svc.clearFlag('f1', 'admin:manual')).toBe('non_admin')
      expect(flagUpdate).not.toHaveBeenCalled()
      expect(queueAdd).not.toHaveBeenCalled()
    })
  })

  describe('flagProfile', () => {
    const flagFindFirst = vi.fn()
    const flagCreate = vi.fn()

    beforeEach(() => {
      ;(prisma as any).profileTrustFlag = {
        ...(prisma as any).profileTrustFlag,
        findFirst: flagFindFirst,
        create: flagCreate,
      }
      flagFindFirst.mockReset()
      flagCreate.mockReset()
    })

    it('writes a PROFILE_UNVETTED flag with note in evidence', async () => {
      flagFindFirst.mockResolvedValue(null)
      const created = {
        id: 'f1',
        profileId: 'p1',
        reason: 'PROFILE_UNVETTED',
        flaggedBy: 'admin:manual',
        evidence: { note: 'sketchy' },
      }
      flagCreate.mockResolvedValue(created)

      const result = await svc.flagProfile('p1', 'sketchy', 'admin:manual')

      expect(flagCreate).toHaveBeenCalledWith({
        data: {
          profileId: 'p1',
          reason: 'PROFILE_UNVETTED',
          flaggedBy: 'admin:manual',
          evidence: { note: 'sketchy' },
        },
      })
      expect(result).toEqual(created)
    })

    it('is idempotent — returns the existing admin flag without creating a second', async () => {
      const existing = {
        id: 'f1',
        profileId: 'p1',
        reason: 'PROFILE_UNVETTED',
        flaggedBy: 'admin:manual',
        evidence: { note: 'first' },
      }
      flagFindFirst.mockResolvedValue(existing)

      const result = await svc.flagProfile('p1', 'second', 'admin:manual')

      expect(result).toEqual(existing)
      expect(flagCreate).not.toHaveBeenCalled()
    })

    it('only treats admin-set flags as the idempotency key', async () => {
      // System flag exists, but findFirst with the admin-prefix filter returns null.
      flagFindFirst.mockResolvedValue(null)
      flagCreate.mockResolvedValue({ id: 'fNew' })

      await svc.flagProfile('p1', 'admin reason', 'admin:manual')

      expect(flagFindFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          profileId: 'p1',
          clearedAt: null,
          flaggedBy: { startsWith: 'admin:' },
        }),
      })
      expect(flagCreate).toHaveBeenCalled()
    })
  })
})
