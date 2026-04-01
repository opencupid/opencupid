import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { appConfig } from '@/lib/appconfig'

const connection = new IORedis(appConfig.REDIS_URL, { maxRetriesPerRequest: null })

export const clusterQueue = new Queue('cluster-index', { connection })

/**
 * Enqueues a cluster index rebuild for a user. Uses profileId as the job ID
 * so only one pending rebuild exists per user at any time (deduplication).
 */
export async function enqueueClusterRebuild(profileId: string): Promise<void> {
  await clusterQueue.add(
    'rebuild',
    { profileId },
    { jobId: `rebuild-${profileId}`, removeOnComplete: { count: 100 }, removeOnFail: { count: 50 } }
  )
}
