import type { AbuseReasonType } from '@zod/generated'
import { prisma } from '@/lib/prisma'

// Tunable threshold — number of active INITIATED conversations (sender = profile)
// that trips the SPAM_BURST flag. Module-local by design; promote to appConfig
// only if runtime tuning becomes routine.
const SPAM_BURST_INITIATED_THRESHOLD = 3

export class AbuseCheckService {
  private static instance: AbuseCheckService | null = null

  private constructor() {}

  static getInstance(): AbuseCheckService {
    if (!this.instance) this.instance = new AbuseCheckService()
    return this.instance
  }

  async isFlaggedFor(reason: AbuseReasonType, profileId: string): Promise<boolean> {
    const flag = await prisma.profileAbuseFlag.findFirst({
      where: { profileId, reason, clearedAt: null },
      select: { id: true },
    })
    return !!flag
  }

  async getActiveFlag(profileId: string): Promise<AbuseReasonType | null> {
    const flag = await prisma.profileAbuseFlag.findFirst({
      where: { profileId, clearedAt: null },
      orderBy: { flaggedAt: 'desc' },
      select: { reason: true },
    })
    return flag?.reason ?? null
  }

  async reconcileSpamBurst(profileId: string): Promise<void> {
    const rows = await prisma.conversation.findMany({
      where: { initiatorProfileId: profileId, status: 'INITIATED' },
      select: { id: true },
    })
    const count = rows.length
    const alreadyFlagged = await this.isFlaggedFor('SPAM_BURST', profileId)

    if (count >= SPAM_BURST_INITIATED_THRESHOLD && !alreadyFlagged) {
      await prisma.profileAbuseFlag.create({
        data: {
          profileId,
          reason: 'SPAM_BURST',
          evidence: {
            conversationIds: rows.map((r) => r.id),
            countAtFlagTime: count,
          },
          flaggedBy: 'heuristic:spam_burst',
        },
      })
    } else if (count < SPAM_BURST_INITIATED_THRESHOLD && alreadyFlagged) {
      await prisma.profileAbuseFlag.updateMany({
        where: { profileId, reason: 'SPAM_BURST', clearedAt: null },
        data: { clearedAt: new Date() },
      })
    }
  }
}
