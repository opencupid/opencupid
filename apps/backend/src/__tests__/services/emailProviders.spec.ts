import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DirectSMTPEmailProvider } from '../../services/providers/DirectSMTPEmailProvider'
import { ListmonkEmailProvider } from '../../services/providers/ListmonkEmailProvider'
import { createEmailProvider } from '../../services/providers/EmailProviderFactory'
import type { TxPayload } from '../../types/email.types'

// Mock appConfig
vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 587,
    SMTP_USER: 'test@example.com',
    SMTP_PASS: 'password',
    EMAIL_FROM: 'from@example.com',
    LISTMONK_URL: 'https://listmonk.example.com',
    LISTMONK_USERNAME: 'admin',
    LISTMONK_PASSWORD: 'password',
  },
}))

// Mock nodemailer
const mockSendMail = vi.fn()
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: mockSendMail,
  })),
}))

// Mock fetch for Listmonk
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Email Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DirectSMTPEmailProvider', () => {
    it('should send email via SMTP with legacy format', async () => {
      const provider = new DirectSMTPEmailProvider()
      mockSendMail.mockResolvedValue(true)

      const payload: TxPayload = {
        to: [{ email: 'test@example.com' }],
        templateId: 0,
        data: {
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
        },
      }

      await provider.sendTransactional(payload)

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'from@example.com',
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      })
    })

    it('should throw error if subject or html missing', async () => {
      const provider = new DirectSMTPEmailProvider()

      const payload: TxPayload = {
        to: [{ email: 'test@example.com' }],
        templateId: 0,
        data: {},
      }

      await expect(provider.sendTransactional(payload)).rejects.toThrow(
        'DirectSMTPEmailProvider requires data.subject and data.html'
      )
    })
  })

  describe('ListmonkEmailProvider', () => {
    it('should send email via Listmonk API', async () => {
      const provider = new ListmonkEmailProvider()
      mockFetch.mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(''),
      })

      const payload: TxPayload = {
        to: [{ email: 'test@example.com', subscriberId: 123 }],
        templateId: 1,
        data: { name: 'John' },
      }

      await provider.sendTransactional(payload)

      expect(mockFetch).toHaveBeenCalledWith('https://listmonk.example.com/api/tx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic YWRtaW46cGFzc3dvcmQ=', // base64 of admin:password
        },
        body: JSON.stringify({
          subscriber_emails: ['test@example.com'],
          subscriber_ids: [123],
          template_id: 1,
          data: { name: 'John' },
          content_type: 'html',
        }),
      })
    })

    it('should throw error on API failure', async () => {
      const provider = new ListmonkEmailProvider()
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue('Error details'),
      })

      const payload: TxPayload = {
        to: [{ email: 'test@example.com' }],
        templateId: 1,
      }

      await expect(provider.sendTransactional(payload)).rejects.toThrow(
        'Listmonk API error: 500 Internal Server Error - Error details'
      )
    })
  })

  describe('EmailProviderFactory', () => {
    it('should create provider with fallback', () => {
      const provider = createEmailProvider()
      expect(provider).toBeDefined()
    })
  })
})