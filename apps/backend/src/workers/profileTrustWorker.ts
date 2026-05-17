import type { Job } from 'bullmq'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { ProfileTrustService, TRUST_WINDOW_MS } from '@/services/profileTrust.service'
import { type ProfileTrustJobData } from '@/queues/profileTrustQueue'

// PROFILE_UNVETTED soft-quarantine length. Shares TRUST_WINDOW_MS with SPAM_BURST
// by design — see the constant's definition for the symmetry rationale.
const UNVETTED_WINDOW_MS = TRUST_WINDOW_MS

export async function processProfileTrustJob(job: Job<ProfileTrustJobData>): Promise<void> {
  const svc = ProfileTrustService.getInstance()
  const data = job.data

  if (data.kind === 'clear-unvetted-window') {
    // Two-phase trust-sweep: (1) age out PROFILE_UNVETTED flags, then
    // (2) state-driven release of PENDING for any profile with zero active flags.
    // The sweep replaces the deleted promote-pendings BullMQ queue — release is
    // now a SQL-driven convergence step, not an event-driven side-channel.
    const cutoff = new Date(Date.now() - UNVETTED_WINDOW_MS)

    // Phase 1 — clear aged PROFILE_UNVETTED flags (non-admin only).
    const flagsToClear = await prisma.profileTrustFlag.findMany({
      where: {
        reason: 'PROFILE_UNVETTED',
        clearedAt: null,
        flaggedAt: { lte: cutoff },
        flaggedBy: { not: { startsWith: 'admin:' } },
      },
      select: { id: true, profileId: true },
    })
    let p1Failed = 0
    for (const { id, profileId } of flagsToClear) {
      try {
        // Conditional clear: if an admin (or any other path) cleared this flag
        // between findMany and now, the updateMany affects 0 rows and we leave
        // their clearedAt/clearedBy attribution intact. Mirrors the pattern in
        // ProfileTrustService.clearFlag.
        await prisma.profileTrustFlag.updateMany({
          where: { id, clearedAt: null },
          data: { clearedAt: new Date(), clearedBy: 'system:unvetted_window' },
        })
      } catch (err) {
        p1Failed += 1
        await job.log(
          `failed to clear ${profileId}: ${err instanceof Error ? err.message : String(err)}`
        )
        logger.error({ err, profileId }, 'trust-sweep phase 1 (clear) failure')
      }
    }

    // Phase 2 — sweep: promote PENDING for any profile with zero active flags
    // and at least one initiator-side PENDING. The SQL anti-join encapsulates
    // the convergence invariant; promotePendingsIfClear's own stillFlagged
    // re-check inside its serializable tx absorbs a flag landing between this
    // findMany and the per-profile tx start.
    const sweepCandidates = await prisma.profile.findMany({
      where: {
        trustFlags: { none: { clearedAt: null } },
        Conversation: { some: { status: 'PENDING' } },
      },
      select: { id: true },
    })
    let p2Failed = 0
    for (const { id: profileId } of sweepCandidates) {
      try {
        await svc.promotePendingsIfClear(profileId)
      } catch (err) {
        p2Failed += 1
        await job.log(
          `failed to promote ${profileId}: ${err instanceof Error ? err.message : String(err)}`
        )
        logger.warn({ err, profileId }, 'trust-sweep phase 2 (promote) failure')
      }
    }

    await job.log(
      `phase 1: cleared ${flagsToClear.length - p1Failed} PROFILE_UNVETTED flag(s)` +
        (p1Failed > 0 ? ` (${p1Failed} failed)` : '') +
        ` | phase 2: promoted ${sweepCandidates.length - p2Failed} profile(s)` +
        (p2Failed > 0 ? ` (${p2Failed} failed)` : '')
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
