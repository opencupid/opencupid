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
import { ProfileTrustService, SPAM_BURST_WINDOW_MS } from '../../services/profileTrust.service'

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
    const profileTrustFlagCreate = vi.fn()
    const profileTrustFlagUpdateMany = vi.fn()
    const conversationUpdateMany = vi.fn()
    const queueAdd = vi.fn()

    beforeEach(() => {
      ;(prisma as any).conversation = {
        count: conversationCount,
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
      profileTrustFlagCreate.mockReset()
      profileTrustFlagUpdateMany.mockReset()
      conversationUpdateMany.mockReset()
      queueAdd.mockReset()
    })

    it('writes flag when threshold reached and not already flagged', async () => {
      conversationCount.mockResolvedValue(3)
      mockedFindFirst.mockResolvedValue(null) // hasTrustFlag returns false

      await svc.reconcileSpamBurst('profile-1')

      expect(profileTrustFlagCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          profileId: 'profile-1',
          reason: 'SPAM_BURST',
          evidence: '3',
          flaggedBy: 'heuristic:spam_burst',
        }),
      })
      // Existing rows are not touched — flag-and-gate, not flag-and-converge.
      expect(conversationUpdateMany).not.toHaveBeenCalled()
    })

    it('is a no-op when at threshold and already flagged (idempotent)', async () => {
      conversationCount.mockResolvedValue(3)
      mockedFindFirst.mockResolvedValue({ id: 'flag-1' } as any) // already flagged

      await svc.reconcileSpamBurst('profile-1')

      // No second flag, no row-status writes, not in the clear branch.
      expect(profileTrustFlagCreate).not.toHaveBeenCalled()
      expect(conversationUpdateMany).not.toHaveBeenCalled()
      expect(profileTrustFlagUpdateMany).not.toHaveBeenCalled()
      expect(queueAdd).not.toHaveBeenCalled()
    })

    it('clears flag (only) when condition resolves — release is sweeper-driven', async () => {
      conversationCount.mockResolvedValue(1) // below threshold
      mockedFindFirst.mockResolvedValue({ id: 'flag-1' } as any) // currently flagged

      await svc.reconcileSpamBurst('profile-1')

      expect(profileTrustFlagUpdateMany).toHaveBeenCalledWith({
        where: { profileId: 'profile-1', reason: 'SPAM_BURST', clearedAt: null },
        data: { clearedAt: expect.any(Date), clearedBy: 'heuristic:spam_burst_below_threshold' },
      })
      // No enqueue — the trust-sweep cron handles the release on its next tick.
      expect(queueAdd).not.toHaveBeenCalled()
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
    })

    it('threshold-counting query includes both INITIATED and PENDING and a createdAt window', async () => {
      conversationCount.mockResolvedValue(0)
      mockedFindFirst.mockResolvedValue(null)
      await svc.reconcileSpamBurst('profile-1')
      expect(conversationCount).toHaveBeenCalledWith({
        where: {
          initiatorProfileId: 'profile-1',
          status: { in: ['INITIATED', 'PENDING'] },
          createdAt: { gte: expect.any(Date) },
        },
      })
    })

    it('threshold window is 24 hours back from now', async () => {
      // Freeze time so we can assert the exact `gte` boundary.
      const FROZEN_NOW = new Date('2026-05-15T09:13:23.161Z')
      vi.useFakeTimers()
      vi.setSystemTime(FROZEN_NOW)
      try {
        conversationCount.mockResolvedValue(0)
        mockedFindFirst.mockResolvedValue(null)
        await svc.reconcileSpamBurst('profile-1')

        const expectedSince = new Date(FROZEN_NOW.getTime() - SPAM_BURST_WINDOW_MS)
        const call = conversationCount.mock.calls[0][0] as any
        expect((call.where.createdAt as { gte: Date }).gte.toISOString()).toBe(
          expectedSince.toISOString()
        )
      } finally {
        vi.useRealTimers()
      }
    })

    it('regression: never writes any conversation-row change on any code path', async () => {
      // Guards against accidental reintroduction of row-touching enforcement. Under
      // the flag-and-gate policy, reconcileSpamBurst maintains the SPAM_BURST flag
      // only — existing conversation rows are never modified by this function.
      // Sweeps the full case matrix (below/at/over threshold × flagged/not).
      for (const [count, flagged] of [
        [0, false],
        [1, false],
        [2, false],
        [3, false],
        [5, false],
        [50, false],
        [0, true],
        [1, true],
        [2, true],
        [3, true],
        [5, true],
        [50, true],
      ] as const) {
        conversationUpdateMany.mockReset()
        conversationCount.mockResolvedValue(count)
        mockedFindFirst.mockResolvedValue(flagged ? ({ id: 'flag-1' } as any) : null)
        await svc.reconcileSpamBurst('profile-1')
        expect(conversationUpdateMany).not.toHaveBeenCalled()
      }
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
    // clearFlag wraps everything in a serializable $transaction: findUnique, conditional
    // updateMany, inline promotePendingsInTx. Mock $transaction to pass through a tx object
    // exposing the methods the implementation calls.
    const transactionFn = vi.fn()
    const txFlagFindUnique = vi.fn()
    const txFlagUpdateMany = vi.fn()
    const txFlagFindFirst = vi.fn()
    const txConversationFindMany = vi.fn()

    beforeEach(() => {
      ;(prisma as any).$transaction = transactionFn
      transactionFn.mockImplementation(async (cb: any) => {
        return cb({
          profileTrustFlag: {
            findUnique: txFlagFindUnique,
            updateMany: txFlagUpdateMany,
            findFirst: txFlagFindFirst,
          },
          conversation: { findMany: txConversationFindMany },
        })
      })
      txFlagFindUnique.mockReset()
      txFlagUpdateMany.mockReset()
      txFlagFindFirst.mockReset()
      txConversationFindMany.mockReset()
      promoteConversationMock.mockReset()
    })

    it('clears the flag and inline-promotes PENDING when no other flags remain — returns "cleared"', async () => {
      txFlagFindUnique.mockResolvedValue({
        id: 'f1',
        profileId: 'p1',
        clearedAt: null,
        flaggedBy: 'admin:manual',
      })
      txFlagUpdateMany.mockResolvedValue({ count: 1 })
      txFlagFindFirst.mockResolvedValue(null) // no other active flag → inline promote runs
      txConversationFindMany.mockResolvedValue([
        { id: 'c1', profileAId: 'p1', profileBId: 'recipient' },
      ])

      const result = await svc.clearFlag('f1', 'admin:manual')

      expect(result).toBe('cleared')
      expect(txFlagUpdateMany).toHaveBeenCalledWith({
        where: { id: 'f1', clearedAt: null },
        data: { clearedAt: expect.any(Date), clearedBy: 'admin:manual' },
      })
      // Inline promote ran inside the same tx (the mock tx is what gets passed through).
      expect(promoteConversationMock).toHaveBeenCalledWith(expect.anything(), 'c1', 'recipient')
    })

    it('skips inline promote when another active flag remains on the profile', async () => {
      txFlagFindUnique.mockResolvedValue({
        id: 'f1',
        profileId: 'p1',
        clearedAt: null,
        flaggedBy: 'admin:manual',
      })
      txFlagUpdateMany.mockResolvedValue({ count: 1 })
      txFlagFindFirst.mockResolvedValue({ id: 'other-flag' } as any) // other flag still active

      const result = await svc.clearFlag('f1', 'admin:manual')

      expect(result).toBe('cleared')
      expect(txConversationFindMany).not.toHaveBeenCalled()
      expect(promoteConversationMock).not.toHaveBeenCalled()
    })

    it('uses Serializable isolation level', async () => {
      txFlagFindUnique.mockResolvedValue({
        id: 'f1',
        profileId: 'p1',
        clearedAt: null,
        flaggedBy: 'admin:manual',
      })
      txFlagUpdateMany.mockResolvedValue({ count: 1 })
      txFlagFindFirst.mockResolvedValue(null)
      txConversationFindMany.mockResolvedValue([])

      await svc.clearFlag('f1', 'admin:manual')

      expect(transactionFn).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: 'Serializable' })
      )
    })

    it('returns "not_found" when the flag is missing', async () => {
      txFlagFindUnique.mockResolvedValue(null)
      expect(await svc.clearFlag('missing', 'admin:manual')).toBe('not_found')
      expect(txFlagUpdateMany).not.toHaveBeenCalled()
      expect(promoteConversationMock).not.toHaveBeenCalled()
    })

    it('returns "already_cleared" when the flag is already cleared at read time', async () => {
      txFlagFindUnique.mockResolvedValue({
        id: 'f1',
        profileId: 'p1',
        clearedAt: new Date(),
        flaggedBy: 'admin:manual',
      })
      expect(await svc.clearFlag('f1', 'admin:manual')).toBe('already_cleared')
      expect(txFlagUpdateMany).not.toHaveBeenCalled()
      expect(promoteConversationMock).not.toHaveBeenCalled()
    })

    it('returns "already_cleared" when a concurrent caller wins the race (count=0)', async () => {
      txFlagFindUnique.mockResolvedValue({
        id: 'f1',
        profileId: 'p1',
        clearedAt: null,
        flaggedBy: 'admin:manual',
      })
      txFlagUpdateMany.mockResolvedValue({ count: 0 })

      const result = await svc.clearFlag('f1', 'admin:manual')

      expect(result).toBe('already_cleared')
      // No inline promote — we didn't actually clear anything.
      expect(promoteConversationMock).not.toHaveBeenCalled()
    })

    it('clears heuristic-set flags too (admin override)', async () => {
      txFlagFindUnique.mockResolvedValue({
        id: 'f1',
        profileId: 'p1',
        clearedAt: null,
        flaggedBy: 'heuristic:spam_burst',
      })
      txFlagUpdateMany.mockResolvedValue({ count: 1 })
      txFlagFindFirst.mockResolvedValue(null)
      txConversationFindMany.mockResolvedValue([])

      const result = await svc.clearFlag('f1', 'admin:manual')

      expect(result).toBe('cleared')
      expect(txFlagUpdateMany).toHaveBeenCalledWith({
        where: { id: 'f1', clearedAt: null },
        data: { clearedAt: expect.any(Date), clearedBy: 'admin:manual' },
      })
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
        evidence: 'sketchy',
      }
      flagCreate.mockResolvedValue(created)

      const result = await svc.flagProfile('p1', 'sketchy', 'admin:manual')

      expect(flagCreate).toHaveBeenCalledWith({
        data: {
          profileId: 'p1',
          reason: 'PROFILE_UNVETTED',
          flaggedBy: 'admin:manual',
          evidence: 'sketchy',
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
        evidence: 'first',
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
