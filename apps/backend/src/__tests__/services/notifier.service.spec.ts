import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotifierService } from '../../services/notifier.service'

let mockPrisma: any
const { mockGetFixedT, mockDispatchEmail, mockLoggerWarn } = vi.hoisted(() => ({
  mockGetFixedT: vi.fn(),
  mockDispatchEmail: vi.fn(),
  mockLoggerWarn: vi.fn(),
}))

const { processBrand, otherBrand } = vi.hoisted(() => ({
  processBrand: {
    domain: 'frontend.test',
    siteName: 'OpenCupid',
    frontendUrl: 'https://frontend.test',
    emailFrom: 'OpenCupid <hello@frontend.test>',
  },
  otherBrand: {
    domain: 'other.test',
    siteName: 'OtherSite',
    frontendUrl: 'https://other.test',
    emailFrom: 'OtherSite <hello@other.test>',
    emailReplyTo: 'support@other.test',
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { warn: mockLoggerWarn },
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
    DOMAIN: 'frontend.test',
    UNSUBSCRIBE_SECRET: 'test-unsubscribe-secret',
    BRANDS: [processBrand, otherBrand],
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
    mockLoggerWarn.mockReset()
    mockGetFixedT.mockReturnValue((key: string) => `${key}-translated`)
  })

  it('notifyUser: skips when user is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('missing-user', 'welcome', { path: '/me' })

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'missing-user' } })
    expect(mockDispatchEmail).not.toHaveBeenCalled()
  })

  it('notifyProfile: skips when profile is missing', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue(null)

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyProfile('missing-profile', 'new_like', {
      path: '/browse',
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
    await service.notifyProfile('profile-1', 'new_like', { path: '/browse' })

    expect(mockDispatchEmail).not.toHaveBeenCalled()
  })

  it('notifyProfile: dispatches email payload for resolved profile user', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue({
      id: 'profile-1',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        originDomain: 'frontend.test',
        language: 'de',
        emailNotificationsOptIn: true,
        profile: { publicName: 'Alice' },
      },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyProfile('profile-1', 'new_like', { path: '/browse' })

    expect(mockGetFixedT).toHaveBeenCalledWith('de')
    expect(mockDispatchEmail).toHaveBeenCalledTimes(1)
    const [payload, jobId] = mockDispatchEmail.mock.calls[0]
    expect(jobId).toMatch(/^new_like-user-1-\d+$/)
    expect(payload).toMatchObject({
      to: 'user@example.com',
      subject: 'emails.new_like.subject-translated',
      // Drives <html lang> on the rendered document — the recipient's language,
      // not the sending container's.
      language: 'de',
      brand: processBrand,
      templateProps: expect.objectContaining({
        siteName: 'OpenCupid',
        publicName: 'Alice',
        contentBody: 'emails.new_like.contentBody-translated',
        callToActionLabel: 'emails.new_like.callToActionLabel-translated',
        callToActionUrl: 'https://frontend.test/browse',
        fallbackHint: 'emails.fallback_hint-translated',
        footer: 'emails.new_like.footer-translated',
        unsubscribeLabel: 'emails.unsubscribe_link-translated',
      }),
    })
    const jwtPath = /[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/
    // Footer link goes to the SPA page (with ?lang= for unauth localization).
    expect(payload.templateProps.unsubscribeUrl).toMatch(
      new RegExp(`^https://frontend\\.test/unsubscribe/${jwtPath.source}\\?lang=de$`)
    )
    // List-Unsubscribe header MUST point at the API path so RFC 8058 one-click
    // POSTs from mail providers reach the backend, not the SPA shell.
    expect(payload.headers['List-Unsubscribe']).toMatch(
      new RegExp(`^<https://frontend\\.test/api/unsubscribe/${jwtPath.source}>$`)
    )
    expect(payload.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  it('notifyProfile: uses sender-scoped deterministic jobId for new_message', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue({
      id: 'recipient-profile',
      user: {
        id: 'user-recipient',
        email: 'recipient@example.com',
        originDomain: 'frontend.test',
        language: 'en',
        emailNotificationsOptIn: true,
        profile: { publicName: 'Bob' },
      },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyProfile('recipient-profile', 'new_message', {
      senderId: 'sender-profile',
      sender: 'Alice',
      preview: { content: 'Hey there', messageType: 'text/plain' },
      path: '/inbox',
    })

    expect(mockDispatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'recipient@example.com' }),
      'new_message-sender-profile-user-recipient'
    )
  })

  describe('new_message preview', () => {
    const recipient = {
      id: 'recipient-profile',
      user: {
        id: 'user-recipient',
        email: 'recipient@example.com',
        originDomain: 'frontend.test',
        language: 'hu',
        emailNotificationsOptIn: true,
        profile: { publicName: 'Bob' },
      },
    }

    async function contentVarsFor(preview: { content: string; messageType: string }) {
      const t = vi.fn((key: string) => `${key}-translated`)
      mockGetFixedT.mockReturnValue(t)
      mockPrisma.profile.findUnique.mockResolvedValue(recipient)
      const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
      await service.notifyProfile('recipient-profile', 'new_message', {
        senderId: 'sender-profile',
        sender: 'Alice',
        preview,
        path: '/inbox',
      })
      const call = t.mock.calls.find(([key]) => key === 'emails.new_message.contentBody') as any
      return call[1]
    }

    it('renders text messages cleaned of markdown', async () => {
      const vars = await contentVarsFor({ content: '**Hi** _there_', messageType: 'text/plain' })
      expect(vars).toMatchObject({ sender: 'Alice', message: 'Hi there' })
    })

    it("renders voice messages as a localized label in the recipient's language", async () => {
      const vars = await contentVarsFor({ content: '', messageType: 'audio/voice' })
      expect(mockGetFixedT).toHaveBeenCalledWith('hu')
      expect(vars.message).toBe('emails.new_message.voice_message-translated')
    })
  })

  it('notifyUser: dispatches welcome email payload for resolved user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailNotificationsOptIn: true,
      profile: { publicName: 'Alice' },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('user-1', 'welcome', { path: '/me' })

    expect(mockDispatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'emails.welcome.subject-translated',
        templateProps: expect.objectContaining({
          siteName: 'OpenCupid',
          publicName: 'Alice',
          contentBody: 'emails.welcome.contentBody-translated',
          callToActionUrl: 'https://frontend.test/me',
        }),
      }),
      'welcome-user-1'
    )
  })

  it('notifyUser: supports users without profile', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'user2@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailNotificationsOptIn: true,
      profile: null,
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('user-2', 'welcome', { path: '/me' })

    expect(mockDispatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user2@example.com',
        subject: 'emails.welcome.subject-translated',
        brand: processBrand,
        templateProps: expect.objectContaining({
          publicName: '',
          callToActionLabel: 'emails.welcome.callToActionLabel-translated',
          callToActionUrl: 'https://frontend.test/me',
        }),
      }),
      'welcome-user-2'
    )
  })

  it('notifyUser: skips suppressible emails when emailNotificationsOptIn is false', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-3',
      email: 'user3@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailNotificationsOptIn: false,
      profile: { publicName: 'Carol' },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('user-3', 'welcome', { path: '/me' })

    expect(mockDispatchEmail).not.toHaveBeenCalled()
  })

  it('notifyUser: always sends login_link even when emailNotificationsOptIn is false', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-4',
      email: 'user4@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailNotificationsOptIn: false,
      profile: { publicName: 'Dave' },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('user-4', 'login_link', {
      path: '/magic-link?token=abc',
    })

    expect(mockDispatchEmail).toHaveBeenCalledTimes(1)
    const [payload] = mockDispatchEmail.mock.calls[0]
    expect(payload.headers).toBeUndefined()
    expect(payload.templateProps.unsubscribeUrl).toBeUndefined()
    expect(payload.templateProps.unsubscribeLabel).toBeUndefined()
  })

  it("brands the email by the recipient's originDomain, not the sending process", async () => {
    mockPrisma.profile.findUnique.mockResolvedValue({
      id: 'profile-other',
      user: {
        id: 'user-other',
        email: 'other@example.com',
        originDomain: 'other.test',
        language: 'en',
        emailNotificationsOptIn: true,
        profile: { publicName: 'Olga' },
      },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyProfile('profile-other', 'new_like', { path: '/browse' })

    const [payload] = mockDispatchEmail.mock.calls[0]
    expect(payload.brand).toEqual(otherBrand)
    expect(payload.templateProps.siteName).toBe('OtherSite')
    expect(payload.templateProps.callToActionUrl).toBe('https://other.test/browse')
    expect(payload.templateProps.unsubscribeUrl).toMatch(/^https:\/\/other\.test\/unsubscribe\//)
    expect(payload.headers['List-Unsubscribe']).toMatch(
      /^<https:\/\/other\.test\/api\/unsubscribe\//
    )
    expect(mockLoggerWarn).not.toHaveBeenCalled()
  })

  it('falls back to the process brand and warns for an unknown originDomain', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-unknown',
      email: 'unknown@example.com',
      originDomain: 'unknown.test',
      language: 'en',
      emailNotificationsOptIn: true,
      profile: null,
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('user-unknown', 'login_link', { path: '/magic-link?token=abc' })

    const [payload] = mockDispatchEmail.mock.calls[0]
    expect(payload.brand).toEqual(processBrand)
    expect(payload.templateProps.callToActionUrl).toBe('https://frontend.test/magic-link?token=abc')
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'unknown.test' }),
      expect.any(String)
    )
  })
})
