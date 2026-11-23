import { describe, it, expect, vi } from 'vitest'

const { MockWorker } = vi.hoisted(() => ({
  MockWorker: vi.fn(function (this: any, name: string, _processor?: unknown, _opts?: unknown) {
    this.name = name
    this.on = vi.fn()
    this.close = vi.fn()
  }),
}))

vi.mock('bullmq', () => ({ Worker: MockWorker }))
vi.mock('@/lib/redis', () => ({ bullConnection: {} }))
vi.mock('@/lib/sentry', () => ({ default: { captureException: vi.fn() } }))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }))
vi.mock('@/services/email/emailSender.service', () => ({ emailService: {} }))
vi.mock('@/workers/emailWorker.processor', () => ({ processEmailJob: vi.fn() }))
vi.mock('@/workers/activityWorker', () => ({ processActivityDistillJob: vi.fn() }))
vi.mock('@/workers/onboardingReminderWorker', () => ({ processOnboardingReminderJob: vi.fn() }))
vi.mock('@/workers/profileTrustWorker', () => ({ processProfileTrustJob: vi.fn() }))
vi.mock('@/workers/nearbyDigestWorker', () => ({ processNearbyDigestJob: vi.fn() }))

import { registerWorkers, BULK_EMAIL_INTERVAL_MS } from '../registerWorkers'

describe('registerWorkers', () => {
  it('rate-limits only the bulk email queue, to one email per 15 s', () => {
    vi.spyOn(process, 'once').mockImplementation(() => process)
    registerWorkers()

    const opts = (name: string) => MockWorker.mock.calls.find(([n]) => n === name)?.[2]
    expect(BULK_EMAIL_INTERVAL_MS).toBe(15_000)
    expect(opts('emails-bulk')).toMatchObject({ limiter: { max: 1, duration: 15_000 } })
    expect(opts('emails')).not.toHaveProperty('limiter')
  })
})
