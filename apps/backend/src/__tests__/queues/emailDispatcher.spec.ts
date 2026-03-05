import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockAdd = vi.fn()

vi.mock('../../queues/emailQueue', () => ({
  emailQueue: { add: mockAdd },
}))

let dispatcher: any

beforeEach(async () => {
  mockAdd.mockClear()
  const mod = await import('../../queues/emailDispatcher')
  dispatcher = mod.dispatcher
})

describe('EmailDispatcher.dispatchEmail', () => {
  it('adds a job to the email queue with correct params', async () => {
    await dispatcher.queueEmail(
      'user@example.com',
      'Welcome',
      'Alice',
      'Open app',
      'https://example.com/app',
      'Hello',
      'OpenCupid',
      'If you did not request this, ignore this email.'
    )

    expect(mockAdd).toHaveBeenCalledWith(
      'sendEmail',
      {
        to: 'user@example.com',
        subject: 'Welcome',
        publicName: 'Alice',
        callToActionLabel: 'Open app',
        callToActionUrl: 'https://example.com/app',
        contentBody: 'Hello',
        siteName: 'OpenCupid',
        footer: 'If you did not request this, ignore this email.',
      },
      { attempts: 5, backoff: { type: 'exponential', delay: 5000 } }
    )
  })

  it('passes through different email content', async () => {
    await dispatcher.queueEmail(
      'other@example.com',
      'Reset',
      'Bob',
      'Reset password',
      'https://example.com/reset',
      'Reset link',
      'Gaia',
      'Need help? Contact support.'
    )

    expect(mockAdd).toHaveBeenCalledWith(
      'sendEmail',
      {
        to: 'other@example.com',
        subject: 'Reset',
        publicName: 'Bob',
        callToActionLabel: 'Reset password',
        callToActionUrl: 'https://example.com/reset',
        contentBody: 'Reset link',
        siteName: 'Gaia',
        footer: 'Need help? Contact support.',
      },
      expect.objectContaining({ attempts: 5 })
    )
  })
})
