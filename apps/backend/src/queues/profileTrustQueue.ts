import { Queue } from 'bullmq'
import { bullConnection } from '@/lib/redis'
import { logger } from '@/lib/logger'

// Job payload — discriminated union on `kind`.
export type ProfileTrustJobData =
  | { kind: 'clear-unvetted-window' }
  | { kind: 'reconcile-many'; allProfiles?: boolean }

// Both schedulers tick on the same 15-min cadence. SPAM_BURST release
// (reconcile-many) and PROFILE_UNVETTED ageing + PENDING promote
// (clear-unvetted-window) must share cadence: the sweep's Phase 2 AND-composes
// all active flags, so the slower clear path bottlenecks release for compound
// cases. Worst-case promote SLA is one tick = 15 min, not 24h + 15 min.
const RECONCILE_CRON = '*/15 * * * *'
const UNVETTED_WINDOW_CRON = '*/15 * * * *'

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

/** Register the repeatable reconcile + unvetted-window jobs. Safe to call on every startup. */
export async function registerProfileTrustJobs(): Promise<void> {
  await profileTrustQueue.upsertJobScheduler(
    'profile-trust-reconcile',
    { pattern: RECONCILE_CRON },
    { name: 'reconcile-many', data: { kind: 'reconcile-many' } }
  )
  await profileTrustQueue.upsertJobScheduler(
    'profile-trust-unvetted-window',
    { pattern: UNVETTED_WINDOW_CRON },
    { name: 'clear-unvetted-window', data: { kind: 'clear-unvetted-window' } }
  )
  logger.info(
    { queue: 'profile-trust', reconcile: RECONCILE_CRON, unvetted_window: UNVETTED_WINDOW_CRON },
    'profile-trust cron registered'
  )
}
