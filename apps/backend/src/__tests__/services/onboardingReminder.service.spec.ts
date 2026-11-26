import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockPrisma: any
const { mockNotifyLoadedUser } = vi.hoisted(() => ({
  mockNotifyLoadedUser: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

vi.mock('@/services/notifier.service', () => ({
  notifierService: {
    notifyLoadedUser: mockNotifyLoadedUser,
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

    mockPrisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    }
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

  it('loads each user with their public name and email preferences', async () => {
    const sendOnboardingReminders = await importService()
    await sendOnboardingReminders(
      new Date('2026-03-30T12:00:00Z'),
      new Date('2026-03-31T12:00:00Z')
    )

    const call = mockPrisma.user.findMany.mock.calls[0][0]
    expect(call.include).toEqual({
      profile: { select: { publicName: true } },
      emailPreferences: { select: { scope: true, granted: true } },
    })
  })

  it('sends a reminder to each loaded user without waiting between them', async () => {
    const users = [
      { id: 'user-1', profile: null },
      { id: 'user-2', profile: { publicName: 'Bob' } },
    ]
    mockPrisma.user.findMany.mockResolvedValue(users)
    const onProgress = vi.fn()

    const sendOnboardingReminders = await importService()
    const count = await sendOnboardingReminders(
      new Date('2026-03-30T12:00:00Z'),
      new Date('2026-03-31T12:00:00Z'),
      onProgress
    )

    expect(count).toBe(2)
    expect(mockNotifyLoadedUser).toHaveBeenCalledTimes(2)
    expect(mockNotifyLoadedUser).toHaveBeenCalledWith(users[0], 'onboarding_reminder', {
      path: '/onboarding',
    })
    expect(mockNotifyLoadedUser).toHaveBeenCalledWith(users[1], 'onboarding_reminder', {
      path: '/onboarding',
    })
    expect(onProgress).toHaveBeenLastCalledWith(2, 2, 'user-2')
  })

  it('returns 0 and sends nothing when no users match', async () => {
    const sendOnboardingReminders = await importService()
    const count = await sendOnboardingReminders(
      new Date('2026-03-30T12:00:00Z'),
      new Date('2026-03-31T12:00:00Z')
    )

    expect(count).toBe(0)
    expect(mockNotifyLoadedUser).not.toHaveBeenCalled()
  })
})
