import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TxPayload } from '../../types/email.types'

// Mock emailQueue first to avoid Redis connection
const mockAdd = vi.fn()
vi.mock('../../queues/emailQueue', () => ({
  emailQueue: {
    add: mockAdd,
  },
}))

// Now import Dispatcher after mocking
const { Dispatcher } = await import('../../queues/dispatcher')

describe('Dispatcher', () => {
  let dispatcher: Dispatcher

  beforeEach(() => {
    vi.clearAllMocks()
    dispatcher = new Dispatcher()
  })

  describe('sendEmail (legacy method)', () => {
    it('should convert legacy email to TxPayload format and queue as transactional', async () => {
      await dispatcher.sendEmail('test@example.com', 'Test Subject', '<p>Test HTML</p>')

      expect(mockAdd).toHaveBeenCalledWith(
        'sendTransactionalEmail',
        {
          type: 'legacy',
          payload: {
            to: [{ email: 'test@example.com' }],
            templateId: 0,
            data: {
              subject: 'Test Subject',
              html: '<p>Test HTML</p>',
            },
          },
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      )
    })
  })

  describe('sendTransactionalEmail', () => {
    it('should queue transactional email with TxPayload', async () => {
      const payload: TxPayload = {
        to: [{ email: 'test@example.com', subscriberId: 123 }],
        templateId: 1,
        data: { name: 'John' },
      }

      await dispatcher.sendTransactionalEmail(payload)

      expect(mockAdd).toHaveBeenCalledWith(
        'sendTransactionalEmail',
        { type: 'transactional', payload },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
      )
    })
  })
})