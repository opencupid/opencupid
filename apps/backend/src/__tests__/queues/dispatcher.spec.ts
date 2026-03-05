import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockAdd = vi.fn()

vi.mock('../../queues/emailQueue', () => ({
  emailQueue: { add: mockAdd },
}))

let dispatcher: any

beforeEach(async () => {
  mockAdd.mockClear()
  const mod = await import('../../queues/dispatcher')
  dispatcher = mod.dispatcher
})

describe('Dispatcher.sendEmail', () => {
  it('adds a job to the email queue with correct params', async () => {
    await dispatcher.sendEmail(
      'user@example.com',
      'Welcome',
      'Alice',
      'Open app',
      'https://example.com/app',
      'Hello'
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
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  })

  it('passes through different email content', async () => {
    await dispatcher.sendEmail(
      'other@example.com',
      'Reset',
      'Bob',
      'Reset password',
      'https://example.com/reset',
      'Reset link'
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
      },
      expect.objectContaining({ attempts: 3 })
    )
  })
})
