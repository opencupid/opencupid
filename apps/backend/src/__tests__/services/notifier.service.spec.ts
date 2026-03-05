import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotifierService } from '../../services/notifier.service'

let mockPrisma: any
const { mockGetFixedT, mockDispatchEmail } = vi.hoisted(() => ({
  mockGetFixedT: vi.fn(),
  mockDispatchEmail: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

vi.mock('@/queues/emailDispatcher', () => ({
  dispatcher: {
    dispatchEmail: mockDispatchEmail,
  },
}))

vi.mock('i18next', () => ({
  default: {
    getFixedT: mockGetFixedT,
  },
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    SITE_NAME: 'OpenCupid',
    FRONTEND_URL: 'https://frontend.test',
  },
}))

describe('NotifierService', () => {
  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      profile: {
        findUnique: vi.fn(),
      },
    }

    mockGetFixedT.mockReset()
    mockDispatchEmail.mockReset()
    mockGetFixedT.mockReturnValue((key: string) => `${key}-translated`)
  })

  it('notifyUser: skips when user is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('missing-user', 'welcome', { link: 'https://frontend.test/me' })

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'missing-user' } })
    expect(mockDispatchEmail).not.toHaveBeenCalled()
  })

  it('notifyUser: skips when user email is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: null,
      language: 'en',
      profile: { publicName: 'Alice' },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('user-1', 'welcome', { link: 'https://frontend.test/me' })

    expect(mockDispatchEmail).not.toHaveBeenCalled()
  })

  it('notifyProfile: skips when profile is missing', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue(null)

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyProfile('missing-profile', 'new_like', {
      link: 'https://frontend.test/browse',
    })

    expect(mockPrisma.profile.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-profile' },
      include: {
        user: {
          include: {
            profile: {
              select: {
                publicName: true,
              },
            },
          },
        },
      },
    })
    expect(mockDispatchEmail).not.toHaveBeenCalled()
  })

  it('notifyProfile: skips when profile has no user', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue({ id: 'profile-1', user: null })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyProfile('profile-1', 'new_like', { link: 'https://frontend.test/browse' })

    expect(mockDispatchEmail).not.toHaveBeenCalled()
  })

  it('notifyProfile: dispatches email payload for resolved profile user', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue({
      id: 'profile-1',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        language: 'de',
        profile: { publicName: 'Alice' },
      },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyProfile('profile-1', 'new_like', { link: 'https://frontend.test/browse' })

    expect(mockGetFixedT).toHaveBeenCalledWith('de')
    expect(mockDispatchEmail).toHaveBeenCalledTimes(1)
    expect(mockDispatchEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'emails.new_like.subject-translated',
      templateProps: {
        siteName: 'OpenCupid',
        publicName: 'Alice',
        contentBody: 'emails.new_like.contentBody-translated',
        callToActionLabel: 'emails.new_like.callToActionLabel-translated',
        callToActionUrl: 'https://frontend.test/browse',
        footer: 'emails.new_like.footer-translated',
      },
    })
  })

  it('notifyUser: dispatches welcome email payload for resolved user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      language: 'en',
      profile: { publicName: 'Alice' },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('user-1', 'welcome', { link: 'https://frontend.test/me' })

    expect(mockDispatchEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'emails.welcome.subject-translated',
      templateProps: {
        siteName: 'OpenCupid',
        publicName: 'Alice',
        contentBody: 'emails.welcome.contentBody-translated',
        callToActionLabel: 'emails.welcome.callToActionLabel-translated',
        callToActionUrl: 'https://frontend.test/me',
        footer: 'emails.welcome.footer-translated',
      },
    })
  })
})
