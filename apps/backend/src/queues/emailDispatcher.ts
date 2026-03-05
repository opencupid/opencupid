import type { EmailPayload } from '../services/email/types'
import { emailQueue } from './emailQueue'

export class EmailDispatcher {
  async dispatchEmail(payload: EmailPayload) {
    await emailQueue.add('sendEmail', payload, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    })
  }
}

export const dispatcher = new EmailDispatcher()
