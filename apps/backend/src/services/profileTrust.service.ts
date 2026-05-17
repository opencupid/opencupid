import type { TrustReasonType } from '@zod/generated/inputTypeSchemas/TrustReasonSchema'
import { Prisma } from '@prisma/client'
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
   * Manual (typically admin) flag clear. Atomic clear-and-release: in a single
   * serializable tx, clears the named flag and — if no other active flag remains
   * on the profile — promotes the profile's PENDING initiator-side conversations
   * to INITIATED, making them visible to recipients.
   *
   * Admin-initiated clears deserve zero-latency release; the inline promote
   * delivers that. System-driven clears (heuristic threshold-down, unvetted-window
   * cron) intentionally do not inline-promote — the trust-sweep cron handles them.
   *
   * Returns a result code; the caller maps it to its protocol-specific response.
   */
  async clearFlag(flagId: string, clearedBy: string): Promise<ClearFlagResult> {
    return await prisma.$transaction(
      async (tx) => {
        const flag = await tx.profileTrustFlag.findUnique({ where: { id: flagId } })
        if (!flag) return 'not_found' as ClearFlagResult
        if (flag.clearedAt) return 'already_cleared' as ClearFlagResult

        // Conditional write: only the call that actually transitions clearedAt
        // null→now wins. A concurrent clearer's update affects 0 rows and we
        // skip the inline promote, avoiding duplicate work and timestamp drift.
        const result = await tx.profileTrustFlag.updateMany({
          where: { id: flagId, clearedAt: null },
          data: { clearedAt: new Date(), clearedBy },
        })
        if (result.count === 0) return 'already_cleared' as ClearFlagResult

        await this.promotePendingsInTx(tx, flag.profileId)
        return 'cleared' as ClearFlagResult
      },
      { isolationLevel: 'Serializable' }
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
   * - count <  threshold AND already flagged: clear the flag. The trust-sweep
   *   cron will release any held PENDING rows on its next tick.
   * - count <  threshold AND not flagged: no-op.
   *
   * The windowed count is the policy lever: old unanswered intros are
   * unresponsiveness, not burst spam, and shouldn't keep a profile flagged forever.
   * System-driven clears (this branch, and the unvetted-window cron) do NOT
   * inline-promote — releasing held messages is the sweeper's job, not the
   * route's hot path. Admin-initiated clearFlag does inline-promote.
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
        // TODO(race): non-idempotent under concurrent reconcile. The check-then-create
        // window between hasTrustFlag() and create() lets two callers (e.g. inline post-send
        // reconcile racing the cron reconcile-many on the same profile) both decide
        // "create flag" and write two active SPAM_BURST rows. Consequence: hasTrustFlag
        // still works, but admin clearFlag(flagId) only clears one row, leaving the other
        // active. Fix: partial unique index on ProfileTrustFlag(profileId, reason) WHERE
        // clearedAt IS NULL; treat P2002 here as "lost the race, flag already exists".
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
    }
  }

  /**
   * Public per-profile release: if the profile has zero active flags, promote
   * all its initiator-side PENDING conversations to INITIATED. Runs in its own
   * serializable tx — used by the trust-sweep cron, one tx per candidate.
   *
   * Per-row races are absorbed by promoteConversation's best-effort no-op
   * (per-row `updateMany WHERE status: 'PENDING'`). Genuine R-W conflicts
   * surface as 40001 at commit; the next 15-min sweeper tick re-picks up the
   * profile because the SQL anti-join still matches, and `stillFlagged` inside
   * `promotePendingsInTx` short-circuits if a flag landed in the meantime.
   */
  async promotePendingsIfClear(profileId: string): Promise<void> {
    await prisma.$transaction(
      async (tx) => {
        await this.promotePendingsInTx(tx, profileId)
      },
      { isolationLevel: 'Serializable' }
    )
  }

  /**
   * In-tx release helper. Idempotent: if any flag is still active for the
   * profile, returns without promoting. Per-row update is conditional on
   * `status: 'PENDING'`, so concurrent recipient replies (`accept_and_promote_pending`)
   * that flipped the row to ACCEPTED leave it untouched.
   *
   * Callers must run this inside a serializable transaction — both the
   * stillFlagged check and the row promotions need consistent isolation to
   * avoid a partial release across a concurrent flag write.
   */
  private async promotePendingsInTx(
    tx: Prisma.TransactionClient,
    profileId: string
  ): Promise<void> {
    const stillFlagged = await tx.profileTrustFlag.findFirst({
      where: { profileId, clearedAt: null },
      select: { id: true },
    })
    if (stillFlagged) return

    const pendings = await tx.conversation.findMany({
      where: { initiatorProfileId: profileId, status: 'PENDING' },
      select: { id: true, profileAId: true, profileBId: true },
    })
    if (pendings.length === 0) return

    const messageService = MessageService.getInstance()
    for (const convo of pendings) {
      const recipientId = convo.profileAId === profileId ? convo.profileBId : convo.profileAId
      await messageService.promoteConversation(tx, convo.id, recipientId)
    }
  }
}
