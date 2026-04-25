import type { TrustReasonType } from '@zod/generated'
import { prisma } from '@/lib/prisma'
import { MessageService } from '@/services/messaging.service'

// Tunable threshold — number of active INITIATED+PENDING conversations (sender = profile)
// that trips the SPAM_BURST flag. Module-local by design; promote to appConfig
// only if runtime tuning becomes routine.
export const SPAM_BURST_THRESHOLD = 3

// Shared builder so every enqueue site uses the same BullMQ dedup key. If the clear
// path here and the clear-unvetted-window worker (Task 6) drifted to different
// formats, two promote-pendings jobs could race inside the serializable tx.
// BullMQ rejects ':' in custom jobIds (Redis key separator); use '-' as separator.
export const promotePendingsJobId = (profileId: string) => `promote-pendings-${profileId}`

/**
 * Result of attempting to clear a flag. The service stays HTTP-agnostic;
 * the route handler maps these codes to status codes (404 for not_found,
 * 409 for already_cleared, 200 for cleared).
 */
export type ClearFlagResult = 'cleared' | 'not_found' | 'already_cleared'

export class ProfileTrustService {
  private static instance: ProfileTrustService | null = null

  private constructor() {}

  static getInstance(): ProfileTrustService {
    if (!this.instance) this.instance = new ProfileTrustService()
    return this.instance
  }

  /**
   * Admin-only manual flag write. Idempotent: if an active admin flag already
   * exists on the profile, returns it unchanged (no second flag, no duplicate
   * evidence). Coexists with system/heuristic flags on the same profile —
   * those are owned by separate machinery.
   */
  async flagProfile(profileId: string, note: string, flaggedBy: string) {
    const existing = await prisma.profileTrustFlag.findFirst({
      where: {
        profileId,
        clearedAt: null,
        flaggedBy: { startsWith: 'admin:' },
      },
    })
    if (existing) return existing

    return prisma.profileTrustFlag.create({
      data: {
        profileId,
        reason: 'PROFILE_UNVETTED',
        flaggedBy,
        evidence: note,
      },
    })
  }

  /**
   * Manual flag clear. Reuses the same promote-pendings enqueue path
   * that the heuristic threshold-down branch uses, so held messages get released
   * the same way regardless of who closed the flag.
   *
   * Note: heuristic SPAM_BURST flags can be cleared this way too, but the
   * already-DISCARDED conversations stay terminal — clearing the flag does not
   * revive them. The next reconcile pass may re-flag if the threshold is still
   * breached.
   *
   * Returns a result code; the caller maps it to its protocol-specific response.
   */
  async clearFlag(flagId: string, clearedBy: string): Promise<ClearFlagResult> {
    const flag = await prisma.profileTrustFlag.findUnique({ where: { id: flagId } })
    if (!flag) return 'not_found'
    if (flag.clearedAt) return 'already_cleared'

    // Conditional write: only the call that actually transitions clearedAt
    // null→now wins. A concurrent clearer's update affects 0 rows and we
    // skip the enqueue, avoiding a duplicate promote-pendings job and
    // timestamp drift on clearedAt/clearedBy.
    const result = await prisma.profileTrustFlag.updateMany({
      where: { id: flagId, clearedAt: null },
      data: { clearedAt: new Date(), clearedBy },
    })
    if (result.count === 0) return 'already_cleared'

    const { profileTrustQueue } = await import('@/queues/profileTrustQueue')
    await profileTrustQueue.add(
      'promote-pendings',
      { kind: 'promote-pendings', profileId: flag.profileId },
      {
        jobId: promotePendingsJobId(flag.profileId),
        removeOnComplete: { count: 0 },
        removeOnFail: { count: 100 },
      }
    )
    return 'cleared'
  }

  /**
   * Admin-list view of trust flags. Active-only by default; pass activeOnly:false to include cleared.
   * Joined with a small profile projection so the admin GUI can render rows without a second roundtrip.
   */
  async listTrustFlags(opts: {
    activeOnly?: boolean
    reason?: TrustReasonType
    page: number
    pageSize: number
  }) {
    const { activeOnly = true, reason, page, pageSize } = opts
    const where = {
      ...(activeOnly ? { clearedAt: null } : {}),
      ...(reason ? { reason } : {}),
    }
    const [flags, total] = await Promise.all([
      prisma.profileTrustFlag.findMany({
        where,
        orderBy: { flaggedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          profile: {
            select: { id: true, publicName: true, country: true, cityName: true },
          },
        },
      }),
      prisma.profileTrustFlag.count({ where }),
    ])
    return { flags, total }
  }

  /**
   * Any active trust flag (optional reason filter).
   * Omit `reason` to answer "is this profile quarantined?" (used by the send-path gate).
   * Pass `reason` to answer "does this profile have X specifically?" (used by reconcile idempotency).
   */
  async hasTrustFlag(profileId: string, reason?: TrustReasonType): Promise<boolean> {
    const flag = await prisma.profileTrustFlag.findFirst({
      where: {
        profileId,
        clearedAt: null,
        ...(reason ? { reason } : {}),
      },
      select: { id: true },
    })
    return !!flag
  }

  /**
   * Convergence function for SPAM_BURST. Drives the world toward the invariant:
   * "a SPAM_BURST-flagged profile has zero INITIATED or PENDING conversations as initiator".
   * ACCEPTED conversations stand — those represent mutual engagement from the recipient.
   *
   * Cases:
   * - count >= threshold AND not flagged: write flag AND DISCARD active rows (INITIATED+PENDING).
   * - count >= threshold AND already flagged: DISCARD any active rows that slipped through
   *   a race (e.g. a send that crossed the hasTrustFlag check at the route before the flag
   *   landed). Idempotent: updateMany hits zero rows in the steady state.
   * - count < threshold AND already flagged: clear the flag AND enqueue promote-pendings
   *   so held messages (if any) can be delivered.
   * - count < threshold AND not flagged: no-op.
   */
  async reconcileSpamBurst(profileId: string): Promise<void> {
    // Only the count drives the threshold decision; we don't need every ID in memory.
    const count = await prisma.conversation.count({
      where: {
        initiatorProfileId: profileId,
        status: { in: ['INITIATED', 'PENDING'] },
      },
    })
    const alreadyFlagged = await this.hasTrustFlag(profileId, 'SPAM_BURST')

    if (count >= SPAM_BURST_THRESHOLD) {
      if (!alreadyFlagged) {
        await prisma.profileTrustFlag.create({
          data: {
            profileId,
            reason: 'SPAM_BURST',
            evidence: String(count),
            flaggedBy: 'heuristic:spam_burst',
          },
        })
      }
      // Enforce the invariant regardless of whether we just wrote the flag or it
      // was already there — closes the race window between the route's pre-tx
      // quarantine check and the tx commit.
      await prisma.conversation.updateMany({
        where: {
          initiatorProfileId: profileId,
          status: { in: ['INITIATED', 'PENDING'] },
        },
        data: { status: 'DISCARDED' },
      })
    } else if (alreadyFlagged) {
      await prisma.profileTrustFlag.updateMany({
        where: { profileId, reason: 'SPAM_BURST', clearedAt: null },
        data: { clearedAt: new Date(), clearedBy: 'heuristic:spam_burst_below_threshold' },
      })
      // Dynamic import — the profile-trust worker (Task 6) imports this service,
      // so a top-level import of the queue would close a cycle once that lands.
      const { profileTrustQueue } = await import('@/queues/profileTrustQueue')
      await profileTrustQueue.add(
        'promote-pendings',
        { kind: 'promote-pendings', profileId },
        {
          jobId: promotePendingsJobId(profileId),
          // drop completed jobs immediately (minimize Redis footprint);
          // retain last 100 failures for diagnostics.
          removeOnComplete: { count: 0 },
          removeOnFail: { count: 100 },
        }
      )
    }
  }

  /**
   * Worker handler: if the profile has zero active flags, promote all its PENDING conversations.
   * Runs in a serializable tx to close the race with reconcileSpamBurst writing DISCARDs.
   * Idempotent — on 40001 retry, if SPAM_BURST landed meanwhile, `stillFlagged` short-circuits.
   * Requires BullMQ worker-level retries (attempts > 1) since Prisma does not auto-retry.
   */
  async promotePendingsIfClear(profileId: string): Promise<void> {
    const messageService = MessageService.getInstance()
    await prisma.$transaction(
      async (tx) => {
        const stillFlagged = await tx.profileTrustFlag.findFirst({
          where: { profileId, clearedAt: null },
          select: { id: true },
        })
        if (stillFlagged) return

        const pendings = await tx.conversation.findMany({
          where: { initiatorProfileId: profileId, status: 'PENDING' },
          select: { id: true, profileAId: true, profileBId: true },
        })
        for (const convo of pendings) {
          const recipientId = convo.profileAId === profileId ? convo.profileBId : convo.profileAId
          await messageService.promoteConversation(tx, convo.id, recipientId)
        }
      },
      { isolationLevel: 'Serializable' }
    )
  }
}
