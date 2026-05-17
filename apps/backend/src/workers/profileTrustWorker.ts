import type { Job } from 'bullmq'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import {
  ProfileTrustService,
  promotePendingsJobId,
  TRUST_WINDOW_MS,
} from '@/services/profileTrust.service'
import { profileTrustQueue, type ProfileTrustJobData } from '@/queues/profileTrustQueue'

// PROFILE_UNVETTED soft-quarantine length. Shares TRUST_WINDOW_MS with SPAM_BURST
// by design — see the constant's definition for the symmetry rationale.
const UNVETTED_WINDOW_MS = TRUST_WINDOW_MS

export async function processProfileTrustJob(job: Job<ProfileTrustJobData>): Promise<void> {
  const svc = ProfileTrustService.getInstance()
  const data = job.data

  if (data.kind === 'promote-pendings') {
    await svc.promotePendingsIfClear(data.profileId)
    await job.log(`promoted pendings (if clear) for ${data.profileId}`)
    return
  }

  if (data.kind === 'clear-unvetted-window') {
    const cutoff = new Date(Date.now() - UNVETTED_WINDOW_MS)
    const flagsToClear = await prisma.profileTrustFlag.findMany({
      where: {
        reason: 'PROFILE_UNVETTED',
        clearedAt: null,
        flaggedAt: { lte: cutoff },
        flaggedBy: { not: { startsWith: 'admin:' } },
      },
      select: { id: true, profileId: true },
    })
    let failed = 0
    for (const { id, profileId } of flagsToClear) {
      try {
        // Enqueue BEFORE clearing the flag. If enqueue fails we never clear, and
        // the next 15-min scan re-finds the still-aged flag and retries. If enqueue
        // succeeds but update then fails, the dedup jobId prevents duplicates and
        // promotePendingsIfClear short-circuits on `stillFlagged`; the next scan
        // will clear. Reverse order would strand PENDINGs on a cleared-but-unqueued
        // failure (no retry path).
        await profileTrustQueue.add(
          'promote-pendings',
          { kind: 'promote-pendings', profileId },
          {
            jobId: promotePendingsJobId(profileId),
            removeOnComplete: { count: 0 },
            removeOnFail: { count: 100 },
          }
        )
        // Conditional clear: if an admin (or any other path) cleared this flag
        // between findMany and now, the updateMany affects 0 rows and we leave
        // their clearedAt/clearedBy attribution intact. Mirrors the pattern in
        // ProfileTrustService.clearFlag.
        await prisma.profileTrustFlag.updateMany({
          where: { id, clearedAt: null },
          data: { clearedAt: new Date(), clearedBy: 'system:unvetted_window' },
        })
      } catch (err) {
        failed += 1
        await job.log(
          `failed to clear ${profileId}: ${err instanceof Error ? err.message : String(err)}`
        )
        logger.error({ err, profileId }, 'clear-unvetted-window per-profile failure')
      }
    }
    await job.log(
      `cleared ${flagsToClear.length - failed} PROFILE_UNVETTED flag(s)` +
        (failed > 0 ? ` (${failed} failed)` : '')
    )
    return
  }

  if (data.kind !== 'reconcile-many') {
    // Exhaustiveness guard: any new ProfileTrustJobData kind triggers a TS error
    // here until its handler is added above.
    const _exhaustive: never = data
    throw new Error(`unhandled profile-trust job kind: ${JSON.stringify(_exhaustive)}`)
  }

  const profiles = data.allProfiles
    ? await prisma.profile.findMany({ where: { isActive: true }, select: { id: true } })
    : await prisma.profile.findMany({
        where: { trustFlags: { some: { clearedAt: null } } },
        select: { id: true },
      })

  let failed = 0
  for (const { id } of profiles) {
    try {
      await svc.reconcileSpamBurst(id)
    } catch (err) {
      failed += 1
      await job.log(
        `failed to reconcile ${id}: ${err instanceof Error ? err.message : String(err)}`
      )
      logger.warn({ err, profileId: id }, 'reconcileSpamBurst failed — skipping')
    }
  }
  await job.log(
    `reconciled ${profiles.length - failed} profile(s)${failed > 0 ? ` (${failed} failed)` : ''}`
  )
}
