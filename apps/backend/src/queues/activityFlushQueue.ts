import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'

const connection = new IORedis(appConfig.REDIS_URL, { maxRetriesPerRequest: null })

export const activityFlushQueue = new Queue('activity-flush', { connection })

/**
 * Enqueues a profile activity event. Uses profileId as the job ID so only
 * one pending job exists per profile at any time (deduplication is free).
 */
export async function enqueueActivity(profileId: string): Promise<void> {
  await activityFlushQueue.add(
    'flush',
    { profileId },
    { jobId: profileId }
  )
}

/**
 * Register the repeatable flush job.
 * Safe to call on every startup — BullMQ deduplicates by cron pattern.
 */
export async function registerActivityFlushJob(): Promise<void> {
  await activityFlushQueue.upsertJobScheduler(
    'flush-schedule',
    { every: 10 * 60 * 1000 },
    { name: 'flush' }
  )
}
