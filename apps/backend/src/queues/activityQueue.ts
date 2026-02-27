import { appConfig } from '@/lib/appconfig'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(appConfig.REDIS_URL, {
  maxRetriesPerRequest: null,
})

export const activityQueue = new Queue('activity-distill', { connection })

/**
 * Register the repeatable distillation job.
 * Safe to call on every startup — BullMQ deduplicates by cron pattern.
 */
export async function registerDistillJob(): Promise<void> {
  await activityQueue.upsertJobScheduler(
    'distill',
    { pattern: appConfig.ACTIVITY_DISTILL_CRON },
    { name: 'distill' }
  )
}
