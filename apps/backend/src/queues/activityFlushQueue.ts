import { Queue } from 'bullmq'
import { bullConnection } from '@/lib/redis'

export const activityFlushQueue = new Queue('activity-flush', { connection: bullConnection })

/**
 * Enqueues a profile activity event. Uses profileId as the job ID so only
 * one pending job exists per profile at any time (deduplication is free).
 */
export async function enqueueActivity(profileId: string): Promise<void> {
  await activityFlushQueue.add(
    'flush',
    { profileId },
    { jobId: profileId, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 } }
  )
}
