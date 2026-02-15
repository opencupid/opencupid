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
    await dispatcher.sendEmail('user@example.com', 'Welcome', '<h1>Hello</h1>')

    expect(mockAdd).toHaveBeenCalledWith(
      'sendEmail',
      { to: 'user@example.com', subject: 'Welcome', html: '<h1>Hello</h1>' },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  })

  it('passes through different email content', async () => {
    await dispatcher.sendEmail('other@example.com', 'Reset', '<p>Reset link</p>')

    expect(mockAdd).toHaveBeenCalledWith(
      'sendEmail',
      { to: 'other@example.com', subject: 'Reset', html: '<p>Reset link</p>' },
      expect.objectContaining({ attempts: 3 })
    )
  })
})
