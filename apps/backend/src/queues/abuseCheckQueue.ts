import { Queue } from 'bullmq'
import { bullConnection } from '@/lib/redis'
import { logger } from '@/lib/logger'

// Job payload — discriminated union on `kind`.
export type AbuseCheckJobData =
  | { kind: 'reconcile-one'; profileId: string }
  | { kind: 'reconcile-many'; allProfiles?: boolean }

const DAILY_CRON = '0 3 * * *' // daily at 03:00 UTC

export const abuseCheckQueue = new Queue<AbuseCheckJobData>('abuse-check', {
  connection: bullConnection,
})

/** Register the repeatable daily reconcile-many job. Safe to call on every startup. */
export async function registerAbuseCheckJob(): Promise<void> {
  await abuseCheckQueue.upsertJobScheduler(
    'abuse-check-daily',
    { pattern: DAILY_CRON },
    {
      name: 'reconcile-many',
      data: { kind: 'reconcile-many' },
    }
  )
  logger.info({ queue: 'abuse-check', pattern: DAILY_CRON }, 'cron registered')
}
