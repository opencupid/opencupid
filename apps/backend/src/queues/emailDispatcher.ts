import type { EmailPayload } from '../services/email/types'
import { emailQueue } from './emailQueue'

export class EmailDispatcher {
  async dispatchEmail(payload: EmailPayload, jobId: string) {
    await emailQueue.add('sendEmail', payload, {
      jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    })
  }
}

export const dispatcher = new EmailDispatcher()
