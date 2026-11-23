import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))
vi.mock('@/services/nearbyDigest.service', () => ({ sendNearbyDigests: mockSend }))

import { jobDataSchema, processNearbyDigestJob } from '../../workers/nearbyDigestWorker'

function fakeJob(data: unknown) {
  return { data, log: vi.fn(), updateProgress: vi.fn() } as any
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

  it('rejects an empty cohort, which would read as everyone', () => {
    expect(() => jobDataSchema.parse({ profileIds: [] })).toThrow()
  })

  it('passes a cohort through and logs its size', async () => {
    const job = fakeJob({ profileIds: ['p1', 'p2'] })

    await processNearbyDigestJob(job)

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ profileIds: ['p1', 'p2'] }))
    expect(job.log).toHaveBeenCalledWith('Run 2026-11-23, 2 profile(s)')
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

  it('reports progress as a percentage, once per percent', async () => {
    mockSend.mockImplementation(async ({ onProgress }) => {
      for (let checked = 1; checked <= 400; checked++) await onProgress(checked, 400)
      return 0
    })
    const job = fakeJob({})

    await processNearbyDigestJob(job)

    const percents = job.updateProgress.mock.calls.map(([p]: [number]) => p)
    expect(percents).toEqual(Array.from({ length: 100 }, (_, i) => i + 1))
  })
})
