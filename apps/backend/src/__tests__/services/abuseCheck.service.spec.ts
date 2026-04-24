import { describe, it, beforeEach, expect, vi } from 'vitest'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    profileAbuseFlag: {
      findFirst: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { AbuseCheckService } from '../../services/abuseCheck.service'

const mockedFindFirst = vi.mocked(prisma.profileAbuseFlag.findFirst)

let svc: AbuseCheckService

beforeEach(() => {
  vi.resetAllMocks()
  ;(AbuseCheckService as any).instance = null
  svc = AbuseCheckService.getInstance()
})

describe('AbuseCheckService', () => {
  describe('isFlaggedFor', () => {
    it('returns false when no flag exists', async () => {
      mockedFindFirst.mockResolvedValue(null)
      expect(await svc.isFlaggedFor('SPAM_BURST', 'profile-1')).toBe(false)
    })

    it('returns true when an active flag exists', async () => {
      mockedFindFirst.mockResolvedValue({ id: 'flag-1' } as any)
      expect(await svc.isFlaggedFor('SPAM_BURST', 'profile-1')).toBe(true)
    })

    it('returns false when only cleared flags exist', async () => {
      mockedFindFirst.mockResolvedValue(null)
      expect(await svc.isFlaggedFor('SPAM_BURST', 'profile-1')).toBe(false)
      expect(mockedFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clearedAt: null }) })
      )
    })
  })

  describe('getActiveFlag', () => {
    it('returns null when no flag exists', async () => {
      mockedFindFirst.mockResolvedValue(null)
      expect(await svc.getActiveFlag('profile-1')).toBeNull()
    })

    it('returns the reason when active flag exists', async () => {
      mockedFindFirst.mockResolvedValue({ reason: 'SPAM_BURST' } as any)
      expect(await svc.getActiveFlag('profile-1')).toBe('SPAM_BURST')
    })

    it('returns most recent when multiple active flags exist', async () => {
      mockedFindFirst.mockResolvedValue({ reason: 'SPAM_BURST' } as any)
      expect(await svc.getActiveFlag('profile-1')).toBe('SPAM_BURST')
      expect(mockedFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { flaggedAt: 'desc' } })
      )
    })
  })
})
