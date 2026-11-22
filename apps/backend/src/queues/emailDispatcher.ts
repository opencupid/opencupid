import type { EmailPayload } from '../services/email/types'
import { logger } from '@/lib/logger'
import { bulkEmailQueue, emailQueue } from './emailQueue'

const ONE_DAY_SECS = 24 * 60 * 60
const ONE_WEEK_SECS = 7 * ONE_DAY_SECS

export class EmailDispatcher {
  /**
   * Completed jobs are kept for a day, so a repeated jobId within that window is
   * dropped by BullMQ. Callers that rerun a bulk send rely on this for dedup.
   */
  async dispatchEmail(payload: EmailPayload, jobId: string, { bulk = false } = {}) {
    const queue = bulk ? bulkEmailQueue : emailQueue
    await queue.add('sendEmail', payload, {
      jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: ONE_DAY_SECS, count: 1000 },
      removeOnFail: { age: ONE_WEEK_SECS, count: 1000 },
    })
    logger.info({ queue: queue.name, jobId }, 'email enqueued')
  }
}

export const dispatcher = new EmailDispatcher()
