import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dispatcher } from '../../queues/emailDispatcher'

const { mockAdd } = vi.hoisted(() => ({
  mockAdd: vi.fn(),
}))

vi.mock('../../queues/emailQueue', () => ({
  emailQueue: { add: mockAdd },
}))

beforeEach(() => {
  mockAdd.mockClear()
})

describe('EmailDispatcher.dispatchEmail', () => {
  it('adds a job to the email queue with correct params', async () => {
    const payload = {
      to: 'user@example.com',
      subject: 'Welcome',
      templateProps: {
        publicName: 'Alice',
        callToActionLabel: 'Open app',
        callToActionUrl: 'https://example.com/app',
        contentBody: 'Hello',
        siteName: 'OpenCupid',
        footer: 'If you did not request this, ignore this email.',
      },
    }

    await dispatcher.dispatchEmail(payload)

    expect(mockAdd).toHaveBeenCalledWith(
      'sendEmail',
      payload,
      { attempts: 5, backoff: { type: 'exponential', delay: 5000 } }
    )
  })

  it('passes through different email content', async () => {
    const payload = {
      to: 'other@example.com',
      subject: 'Reset',
      templateProps: {
        publicName: 'Bob',
        callToActionLabel: 'Reset password',
        callToActionUrl: 'https://example.com/reset',
        contentBody: 'Reset link',
        siteName: 'Gaia',
        footer: 'Need help? Contact support.',
      },
    }

    await dispatcher.dispatchEmail(payload)

    expect(mockAdd).toHaveBeenCalledWith(
      'sendEmail',
      payload,
      expect.objectContaining({ attempts: 5 })
    )
  })
})
