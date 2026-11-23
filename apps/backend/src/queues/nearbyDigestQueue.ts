import { Queue } from 'bullmq'
import { bullConnection } from '@/lib/redis'
import { logger } from '@/lib/logger'

const NEARBY_DIGEST_CRON = '0 9 * * 1' // Mondays at 09:00 UTC

export const nearbyDigestQueue = new Queue('nearby-digest', { connection: bullConnection })

/**
 * Register the repeatable nearby signups digest job.
 * Safe to call on every startup — BullMQ deduplicates by scheduler ID.
 */
export async function registerNearbyDigestJob(): Promise<void> {
  await nearbyDigestQueue.upsertJobScheduler(
    'nearby-digest',
    { pattern: NEARBY_DIGEST_CRON },
    { name: 'nearby-digest' }
  )
  logger.info({ queue: 'nearby-digest', pattern: NEARBY_DIGEST_CRON }, 'cron registered')
}
