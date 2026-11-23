import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))
vi.mock('@/services/nearbyDigest.service', () => ({ sendNearbyDigests: mockSend }))

import { jobDataSchema, processNearbyDigestJob } from '../../workers/nearbyDigestWorker'

function fakeJob(data: unknown) {
  return { data, log: vi.fn() } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-23T09:00:05Z'))
  mockSend.mockResolvedValue(0)
})

describe('nearbyDigestWorker', () => {
  it('defaults to a real run', () => {
    expect(jobDataSchema.parse({})).toEqual({ dryRun: false })
  })

  it('rejects a non-boolean dryRun rather than guessing', () => {
    expect(() => jobDataSchema.parse({ dryRun: 'false' })).toThrow()
  })

  it("passes today's UTC date as the run date", async () => {
    await processNearbyDigestJob(fakeJob({}))

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ runDate: '2026-11-23', dryRun: false })
    )
  })

  it('passes the dry-run flag through and logs each recipient', async () => {
    mockSend.mockImplementation(async ({ onRecipient }) => {
      await onRecipient('profile-1', 4)
      return 1
    })
    const job = fakeJob({ dryRun: true })

    await processNearbyDigestJob(job)

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }))
    expect(job.log).toHaveBeenCalledWith('would send digest for profile-1: 4 new')
    expect(job.log).toHaveBeenLastCalledWith('Done — 1 digest(s)')
  })
})
