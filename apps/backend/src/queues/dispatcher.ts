import { emailQueue } from './emailQueue'
import type { TxPayload } from '@/types/email.types'

export class Dispatcher {
  async sendEmail(to: string, subject: string, html: string) {
    // Convert legacy format to TxPayload and use new provider system
    const txPayload: TxPayload = {
      to: [{ email: to }],
      templateId: 0, // Dummy template ID for direct content
      data: {
        subject,
        html,
      },
    }
    
    await emailQueue.add(
      'sendTransactionalEmail',
      { type: 'legacy', payload: txPayload },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  }

  async sendTransactionalEmail(payload: TxPayload) {
    await emailQueue.add(
      'sendTransactionalEmail',
      { type: 'transactional', payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    )
  }
}

export const dispatcher = new Dispatcher()
