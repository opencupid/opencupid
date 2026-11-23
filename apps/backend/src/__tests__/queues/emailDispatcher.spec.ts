import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dispatcher } from '../../queues/emailDispatcher'
import { brandStub } from '../../test-utils/brand'

const { mockAdd, mockBulkAdd } = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockBulkAdd: vi.fn(),
}))

vi.mock('../../queues/emailQueue', () => ({
  emailQueue: { name: 'emails', add: mockAdd },
  bulkEmailQueue: { name: 'emails-bulk', add: mockBulkAdd },
}))

beforeEach(() => {
  mockAdd.mockClear()
  mockBulkAdd.mockClear()
})

describe('EmailDispatcher.dispatchEmail', () => {
  it('adds a job to the email queue with correct params', async () => {
    const payload = {
      to: 'user@example.com',
      subject: 'Welcome',
      language: 'en',
      brand: brandStub,
      templateProps: {
        publicName: 'Alice',
        callToActionLabel: 'Open app',
        callToActionUrl: 'https://example.com/app',
        contentBody: 'Hello',
        siteName: 'OpenCupid',
        fallbackHint: 'If the button does not work, copy and paste the URL.',
        footer: 'If you did not request this, ignore this email.',
      },
    }

    await dispatcher.dispatchEmail(payload, 'welcome-user-1')

    expect(mockAdd).toHaveBeenCalledWith('sendEmail', payload, {
      jobId: 'welcome-user-1',
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 604800, count: 1000 },
    })
  })

  it('passes through different email content', async () => {
    const payload = {
      to: 'other@example.com',
      subject: 'Reset',
      language: 'en',
      brand: brandStub,
      templateProps: {
        publicName: 'Bob',
        callToActionLabel: 'Reset password',
        callToActionUrl: 'https://example.com/reset',
        contentBody: 'Reset link',
        siteName: 'Gaia',
        fallbackHint: 'If the button does not work, copy and paste the URL.',
        footer: 'Need help? Contact support.',
      },
    }

    await dispatcher.dispatchEmail(payload, 'login_link-user-2')

    expect(mockAdd).toHaveBeenCalledWith(
      'sendEmail',
      payload,
      expect.objectContaining({ jobId: 'login_link-user-2', attempts: 5 })
    )
  })

  it('sends bulk email to the rate-limited bulk queue', async () => {
    const payload = {
      to: 'bulk@example.com',
      subject: 'Reminder',
      language: 'en',
      brand: brandStub,
      templateProps: {
        publicName: '',
        callToActionLabel: 'Finish',
        callToActionUrl: 'https://example.com/onboarding',
        contentBody: 'Finish your profile',
        siteName: 'OpenCupid',
        fallbackHint: 'If the button does not work, copy and paste the URL.',
        footer: '',
      },
    }

    await dispatcher.dispatchEmail(payload, 'onboarding_reminder-user-3', { bulk: true })

    expect(mockBulkAdd).toHaveBeenCalledWith(
      'sendEmail',
      payload,
      expect.objectContaining({ jobId: 'onboarding_reminder-user-3' })
    )
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('keeps non-bulk email on the transactional queue', async () => {
    await dispatcher.dispatchEmail({ to: 'a@example.com' } as any, 'login_link-user-4')

    expect(mockAdd).toHaveBeenCalled()
    expect(mockBulkAdd).not.toHaveBeenCalled()
  })
})
