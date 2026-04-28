import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let mockPrisma: any
const { mockNotifyUser } = vi.hoisted(() => ({
  mockNotifyUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

vi.mock('@/services/notifier.service', () => ({
  notifierService: {
    notifyUser: mockNotifyUser,
  },
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    FRONTEND_URL: 'https://frontend.test',
  },
}))

describe('sendOnboardingReminders', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()

    mockPrisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function importService() {
    const mod = await import('@/services/onboardingReminder.service')
    return mod.sendOnboardingReminders
  }

  it('queries using the provided window dates', async () => {
    const windowStart = new Date('2026-03-30T12:00:00.000Z')
    const windowEnd = new Date('2026-03-31T12:00:00.000Z')
    const sendOnboardingReminders = await importService()
    await sendOnboardingReminders(windowStart, windowEnd)

    const call = mockPrisma.user.findMany.mock.calls[0][0]
    expect(call.where.createdAt.gte).toBe(windowStart)
    expect(call.where.createdAt.lt).toBe(windowEnd)
  })

  it('filters for users with no profile or unfinished onboarding', async () => {
    const sendOnboardingReminders = await importService()
    await sendOnboardingReminders(
      new Date('2026-03-30T12:00:00Z'),
      new Date('2026-03-31T12:00:00Z')
    )

    const call = mockPrisma.user.findMany.mock.calls[0][0]
    expect(call.where.OR).toEqual([{ profile: null }, { profile: { isOnboarded: false } }])
  })

  it('sends reminder for each matching user', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }])

    const sendOnboardingReminders = await importService()
    const promise = sendOnboardingReminders(
      new Date('2026-03-30T12:00:00Z'),
      new Date('2026-03-31T12:00:00Z')
    )
    await vi.runAllTimersAsync()
    const count = await promise

    expect(count).toBe(2)
    expect(mockNotifyUser).toHaveBeenCalledTimes(2)
    expect(mockNotifyUser).toHaveBeenCalledWith('user-1', 'onboarding_reminder', {
      link: 'https://frontend.test/onboarding',
    })
    expect(mockNotifyUser).toHaveBeenCalledWith('user-2', 'onboarding_reminder', {
      link: 'https://frontend.test/onboarding',
    })
  })

  it('returns 0 and sends nothing when no users match', async () => {
    const sendOnboardingReminders = await importService()
    const count = await sendOnboardingReminders(
      new Date('2026-03-30T12:00:00Z'),
      new Date('2026-03-31T12:00:00Z')
    )

    expect(count).toBe(0)
    expect(mockNotifyUser).not.toHaveBeenCalled()
  })
})
