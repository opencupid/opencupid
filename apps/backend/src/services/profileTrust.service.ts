import type { TrustReasonType } from '@zod/generated/inputTypeSchemas/TrustReasonSchema'
import { prisma } from '@/lib/prisma'
import { MessageService } from '@/services/messaging.service'

// Tunable threshold — number of active INITIATED+PENDING conversations (sender = profile)
// within the burst window that trips the SPAM_BURST flag. Module-local by design;
// promote to appConfig only if runtime tuning becomes routine.
export const SPAM_BURST_THRESHOLD = 3

// Shared trust-quarantine window. Both the PROFILE_UNVETTED soft-quarantine
// (new-account vetting) and the SPAM_BURST burst-count predicate use this
// length. Symmetric by design: a fresh account graduates after 24h of normal
// behavior, and burst detection only counts the last 24h of sends — so a user
// who behaves normally after their first day is never penalized for ancient
// unanswered intros. If the two ever need to diverge, the diverging consumer
// should declare its own constant and this one keeps the shared meaning.
export const TRUST_WINDOW_MS = 24 * 60 * 60 * 1000

// Burst window. Scopes the SPAM_BURST count to conversations created within
// this many ms of "now". Without this bound, an all-time count punishes users
// with old unanswered intros forever — that's unresponsiveness, not burst spam.
export const SPAM_BURST_WINDOW_MS = TRUST_WINDOW_MS

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
   * Heuristic SPAM_BURST flags can be cleared this way too — held conversations
   * (PENDING, including any demoted from INITIATED while the flag was on) are
   * released to recipients by promote-pendings the same way as PROFILE_UNVETTED.
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
   * Maintains the SPAM_BURST flag based on a windowed burst count. The flag's only
   * effect is to gate *future* sends via the route's `hasTrustFlag` check —
   * quarantined sends are written as PENDING (sender-only participant), so recipients
   * don't see them. Existing rows are not touched here: a row that was already
   * INITIATED stays INITIATED and remains visible to its recipient. ACCEPTED rows
   * stand — mutual engagement outranks the heuristic.
   *
   * Cases (count is windowed by SPAM_BURST_WINDOW_MS over INITIATED+PENDING):
   * - count >= threshold AND not flagged: write SPAM_BURST flag.
   * - count >= threshold AND already flagged: no-op (flag is in the right state).
   * - count <  threshold AND already flagged: clear the flag AND enqueue
   *   promote-pendings so any PENDING rows held under the flag get released.
   * - count <  threshold AND not flagged: no-op.
   *
   * The windowed count is the policy lever: old unanswered intros are
   * unresponsiveness, not burst spam, and shouldn't keep a profile flagged forever.
   * Release of held PENDING messages on flag clear flows through the existing
   * promote-pendings worker — same path as PROFILE_UNVETTED.
   */
  async reconcileSpamBurst(profileId: string): Promise<void> {
    const since = new Date(Date.now() - SPAM_BURST_WINDOW_MS)
    const count = await prisma.conversation.count({
      where: {
        initiatorProfileId: profileId,
        status: { in: ['INITIATED', 'PENDING'] },
        createdAt: { gte: since },
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
   * Per-row races are absorbed by promoteConversation's best-effort no-op; genuine R-W
   * conflicts surface as 40001 at commit, retried by BullMQ (requires attempts > 1 — Prisma
   * does not auto-retry). On retry `stillFlagged` short-circuits if SPAM_BURST landed.
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
