import { Queue } from 'bullmq'
import { bullConnection } from '@/lib/redis'
import { logger } from '@/lib/logger'

const DISTILL_CRON = '0 3 * * *' // daily at 03:00

export const activityQueue = new Queue('activity-distill', { connection: bullConnection })

/**
 * Register the repeatable distillation job.
 * Safe to call on every startup — BullMQ deduplicates by cron pattern.
 */
export async function registerDistillJob(): Promise<void> {
  await activityQueue.upsertJobScheduler('distill', { pattern: DISTILL_CRON }, { name: 'distill' })
  logger.info({ queue: 'activity-distill', pattern: DISTILL_CRON }, 'cron registered')
}
