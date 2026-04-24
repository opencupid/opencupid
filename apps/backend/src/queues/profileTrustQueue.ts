import { Queue } from 'bullmq'
import { bullConnection } from '@/lib/redis'
import { logger } from '@/lib/logger'

// Job payload — discriminated union on `kind`.
export type ProfileTrustJobData =
  | { kind: 'reconcile-one'; profileId: string }
  | { kind: 'promote-pendings'; profileId: string }
  | { kind: 'clear-unvetted-window' }
  | { kind: 'reconcile-many'; allProfiles?: boolean }

const DAILY_CRON = '0 3 * * *' // daily at 03:00 UTC
const UNVETTED_WINDOW_CRON = '*/15 * * * *' // every 15 minutes

export const profileTrustQueue = new Queue<ProfileTrustJobData>('profile-trust', {
  connection: bullConnection,
  // Queue-level retry defaults. ProfileTrustService.promotePendingsIfClear runs a
  // Postgres Serializable transaction which aborts with 40001 on write-skew with a
  // concurrent reconcileSpamBurst. Prisma doesn't auto-retry 40001 — BullMQ does via
  // these defaults. 3 attempts covers a transient race without overwhelming Redis on
  // a real bug; exponential backoff starting at 1s gives Postgres time to settle.
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
})

/** Register the repeatable daily + unvetted-window jobs. Safe to call on every startup. */
export async function registerProfileTrustJobs(): Promise<void> {
  await profileTrustQueue.upsertJobScheduler(
    'profile-trust-daily',
    { pattern: DAILY_CRON },
    { name: 'reconcile-many', data: { kind: 'reconcile-many' } }
  )
  await profileTrustQueue.upsertJobScheduler(
    'profile-trust-unvetted-window',
    { pattern: UNVETTED_WINDOW_CRON },
    { name: 'clear-unvetted-window', data: { kind: 'clear-unvetted-window' } }
  )
  logger.info(
    { queue: 'profile-trust', daily: DAILY_CRON, unvetted_window: UNVETTED_WINDOW_CRON },
    'profile-trust cron registered'
  )
}
