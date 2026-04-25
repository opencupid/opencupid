import type { TrustReasonType } from '@zod/generated'
import { prisma } from '@/lib/prisma'
import { MessageService } from '@/services/messaging.service'

// Tunable threshold — number of active INITIATED+PENDING conversations (sender = profile)
// that trips the SPAM_BURST flag. Module-local by design; promote to appConfig
// only if runtime tuning becomes routine.
export const SPAM_BURST_THRESHOLD = 3

// Cap on how many conversation IDs we attach to evidence.sampleConversationIds.
// The decision logic only depends on the count (countAtFlagTime); the IDs are a
// support-debugging aid. Bounding keeps the JSONB write small even for extreme
// offenders with hundreds of unanswered threads.
const SPAM_BURST_EVIDENCE_SAMPLE_SIZE = 10

// Shared builder so every enqueue site uses the same BullMQ dedup key. If the clear
// path here and the clear-unvetted-window worker (Task 6) drifted to different
// formats, two promote-pendings jobs could race inside the serializable tx.
// BullMQ rejects ':' in custom jobIds (Redis key separator); use '-' as separator.
export const promotePendingsJobId = (profileId: string) => `promote-pendings-${profileId}`

/**
 * Thrown by clearFlag when the request cannot be honoured.
 * Status fields mirror what the route handler should send — 404 for missing,
 * 409 for state conflicts (already cleared, or non-admin flag).
 */
export class ClearFlagError extends Error {
  constructor(
    message: string,
    public status: 404 | 409
  ) {
    super(message)
    this.name = 'ClearFlagError'
  }
}

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
        evidence: { note },
      },
    })
  }

  /**
   * Admin-only manual flag clear. Reuses the same promote-pendings enqueue path
   * that the heuristic threshold-down branch uses, so held messages get released
   * the same way regardless of who closed the flag.
   *
   * Refuses to clear non-admin flags (heuristic-set or system-set) — those are
   * owned by the convergence machinery and admins can't safely undo them by hand.
   */
  async clearFlag(flagId: string, clearedBy: string): Promise<void> {
    const flag = await prisma.profileTrustFlag.findUnique({ where: { id: flagId } })
    if (!flag) throw new ClearFlagError('flag not found', 404)
    if (flag.clearedAt) throw new ClearFlagError('flag already cleared', 409)
    if (!flag.flaggedBy.startsWith('admin:')) {
      throw new ClearFlagError('cannot clear non-admin flag from admin UI', 409)
    }

    await prisma.profileTrustFlag.update({
      where: { id: flagId },
      data: { clearedAt: new Date(), clearedBy },
    })

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
        // Fetch a bounded sample only when actually writing the flag.
        const sample = await prisma.conversation.findMany({
          where: {
            initiatorProfileId: profileId,
            status: { in: ['INITIATED', 'PENDING'] },
          },
          select: { id: true },
          take: SPAM_BURST_EVIDENCE_SAMPLE_SIZE,
          orderBy: { createdAt: 'asc' },
        })
        await prisma.profileTrustFlag.create({
          data: {
            profileId,
            reason: 'SPAM_BURST',
            evidence: {
              sampleConversationIds: sample.map((r) => r.id),
              countAtFlagTime: count,
            },
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
