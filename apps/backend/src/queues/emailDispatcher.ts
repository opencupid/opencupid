import type { EmailPayload } from '../services/email/types'
import { logger } from '@/lib/logger'
import { emailQueue } from './emailQueue'

const ONE_DAY_SECS = 24 * 60 * 60
const ONE_WEEK_SECS = 7 * ONE_DAY_SECS

export class EmailDispatcher {
  async dispatchEmail(payload: EmailPayload, jobId: string) {
    await emailQueue.add('sendEmail', payload, {
      jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: ONE_DAY_SECS, count: 1000 },
      removeOnFail: { age: ONE_WEEK_SECS, count: 1000 },
    })
    logger.info({ queue: 'emails', jobId }, 'email enqueued')
  }
}

export const dispatcher = new EmailDispatcher()
