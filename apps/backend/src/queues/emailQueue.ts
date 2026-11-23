import { Queue } from 'bullmq'
import { bullConnection } from '@/lib/redis'

/** Transactional email (login links, messages, likes): sent as fast as the worker can. */
export const emailQueue = new Queue('emails', { connection: bullConnection })

/** Bulk email (reminders, digests): its worker is rate-limited to stay under SMTP limits. */
export const bulkEmailQueue = new Queue('emails-bulk', { connection: bullConnection })
