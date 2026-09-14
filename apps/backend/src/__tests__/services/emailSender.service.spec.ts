import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EmailPayload } from '../../services/email/types'
import { brandStub } from '../../test-utils/brand'

const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test' })
  return {
    mockSendMail,
    mockCreateTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  }
})

vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    SMTP_HOST: 'smtp.test',
    SMTP_PORT: 587,
    SMTP_USER: 'user',
    SMTP_PASS: 'pass',
    EMAIL_REPLY_TO: 'support@example.com',
  },
}))

const payload: EmailPayload = {
  to: 'alice@example.com',
  subject: 'Belépő link',
  language: 'hu',
  brand: brandStub,
  templateProps: {
    siteName: 'Komatérkép',
    publicName: 'Alice',
    contentBody: 'Kattints a gombra a belépéshez:',
    callToActionLabel: 'Belépek',
    callToActionUrl: 'https://example.com/magic-link?token=abc',
    fallbackHint: 'Ha a gomb nem működik, másold ki ezt a címsorba:',
    footer: 'Ha nem Te kérted, hagyd figyelmen kívül.',
  },
}

describe('EmailService.sendEmail', () => {
  let emailService: { sendEmail: (p: EmailPayload, from: string) => Promise<unknown> }

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('../../services/email/emailSender.service')
    emailService = mod.emailService
  })

  // Without an explicit text part nodemailer emits a bare text/html message and
  // the relay synthesises plaintext by stripping our markup — repeating the CTA
  // URL once per occurrence in the HTML. Sending multipart/alternative keeps
  // that body ours.
  it('sends both a text and an HTML part', async () => {
    await emailService.sendEmail(payload, 'Komatérkép <hello@example.com>')

    expect(mockSendMail).toHaveBeenCalledTimes(1)
    const options = mockSendMail.mock.calls[0][0]
    expect(options.html).toContain('<!doctype html>')
    expect(options.text).toContain('Kattints a gombra a belépéshez:')
    expect(options.text).toContain('Belépek: https://example.com/magic-link?token=abc')
  })

  it('repeats the CTA URL only once in the text part', async () => {
    await emailService.sendEmail(payload, 'Komatérkép <hello@example.com>')

    const { text } = mockSendMail.mock.calls[0][0]
    expect(text.split(payload.templateProps.callToActionUrl).length - 1).toBe(1)
  })

  it('passes through recipient, subject, from and headers', async () => {
    await emailService.sendEmail(
      { ...payload, headers: { 'List-Unsubscribe': '<https://x>' } },
      'Komatérkép <hello@example.com>'
    )

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Komatérkép <hello@example.com>',
        to: 'alice@example.com',
        subject: 'Belépő link',
        headers: { 'List-Unsubscribe': '<https://x>' },
      })
    )
  })

  it('sets Reply-To from EMAIL_REPLY_TO config', async () => {
    await emailService.sendEmail(payload, 'Komatérkép <hello@example.com>')

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'support@example.com' })
    )
  })

  it('leaves Reply-To undefined when EMAIL_REPLY_TO is not configured', async () => {
    vi.doMock('@/lib/appconfig', () => ({
      appConfig: {
        SMTP_HOST: 'smtp.test',
        SMTP_PORT: 587,
        SMTP_USER: 'user',
        SMTP_PASS: 'pass',
      },
    }))
    vi.resetModules()
    const mod = await import('../../services/email/emailSender.service')

    await mod.emailService.sendEmail(payload, 'Komatérkép <hello@example.com>')

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: undefined }))
  })
})
