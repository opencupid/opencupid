import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotifierService } from '../../services/notifier.service'

// Mock dispatcher - need to use a factory function to avoid hoisting issues
vi.mock('@/queues/dispatcher', () => ({
  dispatcher: {
    sendEmail: vi.fn(),
  },
}))

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock appconfig
vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    SITE_NAME: 'TestSite',
  },
}))

// Mock i18next
vi.mock('i18next', () => ({
  default: {
    getFixedT: vi.fn(() => (key: string, args: any) => {
      if (key === 'emails.loginLink.subject') return `Login to ${args.siteName}`
      if (key === 'emails.loginLink.html') return `<p>Your OTP: ${args.otp}</p>`
      return key
    }),
  },
}))

describe('NotifierService', () => {
  let notifierService: NotifierService
  let mockSendEmail: any
  let mockPrisma: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Get the mocked dispatcher and prisma
    const { dispatcher } = await import('@/queues/dispatcher')
    const { prisma } = await import('@/lib/prisma')
    
    mockSendEmail = vi.mocked(dispatcher.sendEmail)
    mockPrisma = vi.mocked(prisma)
    
    // Setup default user data
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
      language: 'en',
    })
    
    mockPrisma.profile.findUnique.mockResolvedValue({
      id: 'profile123',
      user: {
        id: 'user123',
        email: 'test@example.com',
        language: 'en',
      },
    })
    
    notifierService = NotifierService.getInstance()
  })

  describe('notifyUser', () => {
    it('should send email notification to user', async () => {
      await notifierService.notifyUser('user123', 'login_link', {
        otp: '123456',
        link: 'https://example.com/login',
      })

      expect(mockSendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Login to TestSite',
        '<p>Your OTP: 123456</p>'
      )
    })

    it('should not send email if user has no email', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user123',
        email: null,
        language: 'en',
      })

      await notifierService.notifyUser('user123', 'login_link', {
        otp: '123456',
        link: 'https://example.com/login',
      })

      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('should not send email if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null)

      await notifierService.notifyUser('user123', 'login_link', {
        otp: '123456',
        link: 'https://example.com/login',
      })

      expect(mockSendEmail).not.toHaveBeenCalled()
    })
  })

  describe('notifyProfile', () => {
    it('should send email notification to profile user', async () => {
      await notifierService.notifyProfile('profile123', 'welcome', {
        link: 'https://example.com/welcome',
      })

      expect(mockSendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'emails.welcome.subject',
        'emails.welcome.html'
      )
    })

    it('should not send email if profile not found', async () => {
      mockPrisma.profile.findUnique.mockResolvedValueOnce(null)

      await notifierService.notifyProfile('profile123', 'welcome', {
        link: 'https://example.com/welcome',
      })

      expect(mockSendEmail).not.toHaveBeenCalled()
    })
  })
})