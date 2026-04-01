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
    // Fix "now" to 2026-04-01T12:00:00Z
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'))

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

  it('queries the correct 24h window (1-2 days ago)', async () => {
    const sendOnboardingReminders = await importService()
    await sendOnboardingReminders()

    const call = mockPrisma.user.findMany.mock.calls[0][0]
    const { gte, lt } = call.where.createdAt

    // 2 days ago = 2026-03-30T12:00:00Z
    expect(gte.toISOString()).toBe('2026-03-30T12:00:00.000Z')
    // 1 day ago = 2026-03-31T12:00:00Z
    expect(lt.toISOString()).toBe('2026-03-31T12:00:00.000Z')
  })

  it('filters for users with no profile or unfinished onboarding', async () => {
    const sendOnboardingReminders = await importService()
    await sendOnboardingReminders()

    const call = mockPrisma.user.findMany.mock.calls[0][0]
    expect(call.where.OR).toEqual([{ profile: null }, { profile: { isOnboarded: false } }])
    expect(call.where.email).toEqual({ not: null })
  })

  it('sends reminder for each matching user', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }])

    const sendOnboardingReminders = await importService()
    const count = await sendOnboardingReminders()

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
    const count = await sendOnboardingReminders()

    expect(count).toBe(0)
    expect(mockNotifyUser).not.toHaveBeenCalled()
  })
})
