import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotifierService } from '../../services/notifier.service'

let mockPrisma: any
const { mockGetFixedT, mockTFor, mockDispatchEmail } = vi.hoisted(() => {
  const mockGetFixedT = vi.fn()
  return {
    mockGetFixedT,
    // tFor(brand, language): the brand only picks the fallback locale
    mockTFor: vi.fn((_brand: unknown, language: string) => mockGetFixedT(language)),
    mockDispatchEmail: vi.fn(),
  }
})

const { defaultBrand, otherBrand } = vi.hoisted(() => ({
  defaultBrand: {
    domain: 'frontend.test',
    siteName: 'OpenCupid',
    frontendUrl: 'https://frontend.test',
    emailFrom: 'OpenCupid <hello@frontend.test>',
    fallbackLocale: 'en',
  },
  otherBrand: {
    domain: 'other.test',
    siteName: 'OtherSite',
    frontendUrl: 'https://other.test',
    emailFrom: 'OtherSite <hello@other.test>',
    emailReplyTo: 'support@other.test',
    fallbackLocale: 'hu',
  },
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

vi.mock('@/lib/i18n', () => ({ tFor: mockTFor }))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    UNSUBSCRIBE_SECRET: 'test-unsubscribe-secret',
    brands: [defaultBrand, otherBrand],
  },
}))

/** Preference rows with every listed scope granted. */
const granted = (...scopes: string[]) => scopes.map((scope) => ({ scope, granted: true }))
const ALL_GRANTED = granted('notifications', 'reminders', 'newsletter')

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
    mockTFor.mockClear()
    mockDispatchEmail.mockReset()
    mockGetFixedT.mockReturnValue((key: string) => `${key}-translated`)
  })

  it('notifyUser: skips when user is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('missing-user', 'welcome', { path: '/me' })

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-user' },
      include: { emailPreferences: { select: { scope: true, granted: true } } },
    })
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
            emailPreferences: { select: { scope: true, granted: true } },
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
        emailPreferences: ALL_GRANTED,
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
      brand: defaultBrand,
      templateProps: expect.objectContaining({
        siteName: 'OpenCupid',
        publicName: 'Alice',
        contentBody: 'emails.new_like.contentBody-translated',
        callToActionLabel: 'emails.new_like.callToActionLabel-translated',
        callToActionUrl:
          'https://frontend.test/browse?utm_source=notification&utm_medium=email&utm_campaign=new_like',
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
        emailPreferences: ALL_GRANTED,
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
      'new_message-sender-profile-user-recipient',
      { bulk: false }
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
        emailPreferences: ALL_GRANTED,
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
      emailPreferences: ALL_GRANTED,
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
          callToActionUrl:
            'https://frontend.test/me?utm_source=notification&utm_medium=email&utm_campaign=welcome',
        }),
      }),
      'welcome-user-1',
      { bulk: false }
    )
  })

  it('notifyUser: supports users without profile', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'user2@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailPreferences: ALL_GRANTED,
      profile: null,
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('user-2', 'welcome', { path: '/me' })

    expect(mockDispatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user2@example.com',
        subject: 'emails.welcome.subject-translated',
        brand: defaultBrand,
        templateProps: expect.objectContaining({
          publicName: '',
          callToActionLabel: 'emails.welcome.callToActionLabel-translated',
          callToActionUrl:
            'https://frontend.test/me?utm_source=notification&utm_medium=email&utm_campaign=welcome',
        }),
      }),
      'welcome-user-2',
      { bulk: false }
    )
  })

  it('notifyUser: skips notification emails when notifications are off', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-3',
      email: 'user3@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailPreferences: granted('reminders', 'newsletter'),
      profile: { publicName: 'Carol' },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('user-3', 'welcome', { path: '/me' })

    expect(mockDispatchEmail).not.toHaveBeenCalled()
  })

  it('notifyUser: always sends login_link, even with no preference granted', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-4',
      email: 'user4@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailPreferences: granted('reminders', 'newsletter'),
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
        emailPreferences: ALL_GRANTED,
        profile: { publicName: 'Olga' },
      },
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyProfile('profile-other', 'new_like', { path: '/browse' })

    const [payload] = mockDispatchEmail.mock.calls[0]
    expect(mockTFor).toHaveBeenCalledWith(otherBrand, 'en')
    expect(payload.brand).toEqual(otherBrand)
    expect(payload.templateProps.siteName).toBe('OtherSite')
    expect(payload.templateProps.callToActionUrl).toBe(
      'https://other.test/browse?utm_source=notification&utm_medium=email&utm_campaign=new_like'
    )
    expect(payload.templateProps.unsubscribeUrl).toMatch(/^https:\/\/other\.test\/unsubscribe\//)
    expect(payload.headers['List-Unsubscribe']).toMatch(
      /^<https:\/\/other\.test\/api\/unsubscribe\//
    )
  })

  it('refuses to send to a user whose originDomain is no brand', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-unknown',
      email: 'unknown@example.com',
      originDomain: 'unknown.test',
      language: 'en',
      emailPreferences: ALL_GRANTED,
      profile: null,
    })

    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await expect(
      service.notifyUser('user-unknown', 'login_link', { path: '/magic-link?token=abc' })
    ).rejects.toThrow('No brand for domain unknown.test')
    expect(mockDispatchEmail).not.toHaveBeenCalled()
  })

  describe('nearby_digest', () => {
    const digestUser = {
      id: 'user-digest',
      email: 'digest@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailPreferences: ALL_GRANTED,
      profile: { publicName: 'Dora' },
    } as any

    async function sendDigest() {
      const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
      await service.notifyLoadedUser(
        digestUser,
        'nearby_digest',
        { path: '/browse', count: 4 },
        { dedupSuffix: '2026-11-23' }
      )
      return mockDispatchEmail.mock.calls[0]
    }

    it('goes on the bulk queue with one dispatch key per user per run', async () => {
      const [, key, opts] = await sendDigest()
      expect(key).toBe('nearby_digest-user-digest-2026-11-23')
      expect(opts).toEqual({ bulk: true })
    })

    it('passes count to the ICU plural in the body', async () => {
      const t = vi.fn((key: string) => key)
      mockGetFixedT.mockReturnValue(t)
      await sendDigest()
      const call = t.mock.calls.find(([key]) => key === 'emails.nearby_digest.contentBody') as any
      expect(call[1]).toMatchObject({ count: 4 })
    })

    it('carries an unsubscribe link scoped to reminder emails', async () => {
      const [payload] = await sendDigest()
      const { verifyUnsubscribeToken } = await import('../../services/email/unsubscribeToken')
      const token = payload.templateProps.unsubscribeUrl.split('/unsubscribe/')[1].split('?')[0]
      expect(verifyUnsubscribeToken(token)?.scope).toBe('reminders')
      expect(payload.headers['List-Unsubscribe']).toContain(token)
    })

    it('labels the footer link with what it stops', async () => {
      const t = vi.fn((key: string) => key)
      mockGetFixedT.mockReturnValue(t)
      const [payload] = await sendDigest()
      expect(payload.templateProps.unsubscribeLabel).toBe('emails.unsubscribe_link_nearby_signups')
    })

    it('is sent when only reminders are granted', async () => {
      const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
      await service.notifyLoadedUser(
        { ...digestUser, emailPreferences: granted('reminders') },
        'nearby_digest',
        { path: '/browse', count: 4 }
      )
      expect(mockDispatchEmail).toHaveBeenCalledOnce()
    })

    it('is suppressed when the user turned off reminder emails', async () => {
      const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
      await service.notifyLoadedUser(
        {
          ...digestUser,
          emailPreferences: [...granted('notifications'), { scope: 'reminders', granted: false }],
        },
        'nearby_digest',
        { path: '/browse', count: 4 }
      )
      expect(mockDispatchEmail).not.toHaveBeenCalled()
    })
  })

  it('sends nothing suppressible when the user has no preference rows', async () => {
    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyLoadedUser(
      {
        id: 'user-none',
        email: 'none@example.com',
        originDomain: 'frontend.test',
        language: 'en',
        emailPreferences: [],
        profile: null,
      } as any,
      'new_like',
      { path: '/browse' }
    )
    expect(mockDispatchEmail).not.toHaveBeenCalled()
  })

  it('sends notification emails when reminders are off', async () => {
    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyLoadedUser(
      {
        id: 'user-like',
        email: 'like@example.com',
        originDomain: 'frontend.test',
        language: 'en',
        emailPreferences: granted('notifications'),
        profile: null,
      } as any,
      'new_like',
      { path: '/browse' }
    )
    expect(mockDispatchEmail).toHaveBeenCalledOnce()
  })

  describe('call-to-action UTM tags', () => {
    const user = {
      id: 'user-utm',
      email: 'utm@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailPreferences: ALL_GRANTED,
      profile: null,
    } as any

    async function payloadFor(type: any, args: any) {
      const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
      await service.notifyLoadedUser(user, type, args)
      return mockDispatchEmail.mock.calls[0][0]
    }

    it('tags the link with the email type as campaign', async () => {
      const payload = await payloadFor('nearby_digest', { path: '/browse', count: 3 })
      const url = new URL(payload.templateProps.callToActionUrl)
      expect(url.pathname).toBe('/browse')
      expect(Object.fromEntries(url.searchParams)).toEqual({
        utm_source: 'notification',
        utm_medium: 'email',
        utm_campaign: 'nearby_digest',
      })
    })

    it('keeps the copy-paste fallback URL untagged', async () => {
      const payload = await payloadFor('nearby_digest', { path: '/browse', count: 3 })
      expect(payload.templateProps.callToActionUrl).toContain('utm_campaign=nearby_digest')
      expect(payload.templateProps.fallbackUrl).toBe('https://frontend.test/browse')
    })

    it('leaves the login link untagged', async () => {
      const payload = await payloadFor('login_link', { path: '/magic-link?token=abc' })
      expect(payload.templateProps.callToActionUrl).toBe(
        'https://frontend.test/magic-link?token=abc'
      )
    })

    it('does not tag unsubscribe links', async () => {
      const payload = await payloadFor('new_like', { path: '/browse' })
      expect(payload.templateProps.unsubscribeUrl).not.toContain('utm_')
      expect(payload.headers['List-Unsubscribe']).not.toContain('utm_')
    })
  })

  it('signs unsubscribe links for other types with the notifications scope', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-like',
      email: 'like@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailPreferences: ALL_GRANTED,
      profile: null,
    })
    const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
    await service.notifyUser('user-like', 'new_like', { path: '/browse' })

    const [payload] = mockDispatchEmail.mock.calls[0]
    const { verifyUnsubscribeToken } = await import('../../services/email/unsubscribeToken')
    const token = payload.templateProps.unsubscribeUrl.split('/unsubscribe/')[1].split('?')[0]
    expect(verifyUnsubscribeToken(token)?.scope).toBe('notifications')
  })

  describe('notifyLoadedUser', () => {
    const loadedUser = {
      id: 'user-loaded',
      email: 'loaded@example.com',
      originDomain: 'frontend.test',
      language: 'en',
      emailPreferences: ALL_GRANTED,
      profile: null,
    } as any

    it('dispatches without looking the user up again', async () => {
      const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
      await service.notifyLoadedUser(loadedUser, 'welcome', { path: '/me' })

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
      expect(mockDispatchEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'loaded@example.com' }),
        'welcome-user-loaded',
        { bulk: false }
      )
    })

    it('suppresses onboarding reminders under the notifications scope', async () => {
      const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
      await service.notifyLoadedUser(
        { ...loadedUser, emailPreferences: granted('reminders') },
        'onboarding_reminder',
        { path: '/onboarding' }
      )

      expect(mockDispatchEmail).not.toHaveBeenCalled()
    })

    it('sends onboarding reminders on the bulk queue', async () => {
      const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
      await service.notifyLoadedUser(loadedUser, 'onboarding_reminder', { path: '/onboarding' })

      expect(mockDispatchEmail).toHaveBeenCalledWith(
        expect.anything(),
        'onboarding_reminder-user-loaded',
        { bulk: true }
      )
    })

    it('keeps login links off the bulk queue', async () => {
      const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
      await service.notifyLoadedUser(loadedUser, 'login_link', { path: '/magic-link?token=abc' })

      expect(mockDispatchEmail.mock.calls[0][2]).toEqual({ bulk: false })
    })

    it('appends the dedup suffix to the dispatch key', async () => {
      const service = new NotifierService({ dispatchEmail: mockDispatchEmail } as any)
      await service.notifyLoadedUser(
        loadedUser,
        'onboarding_reminder',
        { path: '/onboarding' },
        { dedupSuffix: '2026-11-23' }
      )

      expect(mockDispatchEmail.mock.calls[0][1]).toBe('onboarding_reminder-user-loaded-2026-11-23')
    })
  })
})
