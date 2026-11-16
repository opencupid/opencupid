import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../lib/prisma', () => ({ prisma: { $executeRaw: vi.fn() } }))
vi.mock('../../lib/logger', () => ({ logger: { info: vi.fn() } }))

import { syncHiddenFromResults } from '../../services/profileVisibility.service'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'

const mockExecuteRaw = vi.mocked(prisma.$executeRaw)

describe('syncHiddenFromResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecuteRaw.mockResolvedValue(3 as never)
  })

  it('treats profiles as unseen 5 days before now', async () => {
    await syncHiddenFromResults(new Date('2026-11-07T03:00:00Z'))

    const [, unseenSince] = mockExecuteRaw.mock.calls[0]
    expect(unseenSince).toEqual(new Date('2026-11-02T03:00:00Z'))
  })

  it('checks the face, intro and last-seen conditions', async () => {
    await syncHiddenFromResults()

    const sql = (mockExecuteRaw.mock.calls[0][0] as unknown as string[]).join('?')
    expect(sql).toContain('NOT pr."hasFace"')
    expect(sql).toContain(`f."field" IN ('introSocial', 'introDating')`)
    expect(sql).toContain('s."lastSeenAt" < ?')
  })

  it('logs how many profiles changed', async () => {
    await syncHiddenFromResults()

    expect(logger.info).toHaveBeenCalledWith({ changed: 3 }, 'profile visibility synced')
  })
})
