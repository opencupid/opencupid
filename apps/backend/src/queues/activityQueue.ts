import { appConfig } from '@/lib/appconfig'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(appConfig.REDIS_URL, {
  maxRetriesPerRequest: null,
})

const DISTILL_CRON = '0 3 * * *' // daily at 03:00

export const activityQueue = new Queue('activity-distill', { connection })

/**
 * Register the repeatable distillation job.
 * Safe to call on every startup — BullMQ deduplicates by cron pattern.
 */
export async function registerDistillJob(): Promise<void> {
  await activityQueue.upsertJobScheduler('distill', { pattern: DISTILL_CRON }, { name: 'distill' })
}
