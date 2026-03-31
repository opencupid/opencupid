import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'

const connection = new IORedis(appConfig.REDIS_URL, { maxRetriesPerRequest: null })

export const activityFlushQueue = new Queue('activity-flush', { connection })

/**
 * Enqueues a profile activity event. Uses profileId as the job ID so only
 * one pending job exists per profile at any time (deduplication is free).
 * The job is discarded if an identical jobId already exists in the queue.
 */
export async function enqueueActivity(profileId: string): Promise<void> {
  await activityFlushQueue.add(
    'flush',
    { profileId, seenAt: new Date().toISOString() },
    { jobId: profileId }
  )
}
