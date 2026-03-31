import { enqueueActivity } from '@/queues/activityFlushQueue'

/**
 * Records profile activity by enqueuing a flush event.
 * The activityFlushWorker processes the event and writes a ProfileSessionLog
 * row when the 30-minute session gap is exceeded.
 * Deduplication is handled by the queue (one pending job per profileId).
 */
export async function recordActivity(profileId: string): Promise<void> {
  await enqueueActivity(profileId)
}
