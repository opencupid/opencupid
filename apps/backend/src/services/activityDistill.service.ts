import { ActivitySegment, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Tunable constants (could be made configurable if needed)
const DORMANT_THRESHOLD_DAYS = 14
const RETURNING_MIN_ACTIVE_DAYS = 2
const FREQUENT_MIN_ACTIVE_DAYS = 8
const HYSTERESIS_K = 2
const RETENTION_DAYS = 28
const BATCH_SIZE = 10

/** Ordered from highest to lowest priority for comparison. */
const SEGMENT_RANK: Record<ActivitySegment, number> = {
  frequent: 3,
  returning: 2,
  new: 1,
  dormant: 0,
}

/**
 * Compute the raw segment from summary stats (before hysteresis).
 */
export function computeRawSegment(
  lastSeenAt: Date,
  activeDays28: number,
  now: Date
): ActivitySegment {
  const daysSinceLastSeen = (now.getTime() - lastSeenAt.getTime()) / (1000 * 60 * 60 * 24)

  // Highest priority: dormant if not seen in 14+ days
  if (daysSinceLastSeen >= DORMANT_THRESHOLD_DAYS) return 'dormant'

  // Frequent: 8+ active days in last 28d
  if (activeDays28 >= FREQUENT_MIN_ACTIVE_DAYS) return 'frequent'

  // Returning: visited on 2+ distinct days (evidence of actual return)
  if (activeDays28 >= RETURNING_MIN_ACTIVE_DAYS) return 'returning'

  // New: single-visit users who haven't yet demonstrated engagement
  return 'new'
}

/**
 * Apply hysteresis: promotion is immediate, demotion requires K consecutive runs.
 */
export function applyHysteresis(
  currentSegment: ActivitySegment,
  computedSegment: ActivitySegment,
  demotionStreak: number
): { segment: ActivitySegment; demotionStreak: number } {
  const currentRank = SEGMENT_RANK[currentSegment]
  const computedRank = SEGMENT_RANK[computedSegment]

  // Promotion (or same): apply immediately
  if (computedRank >= currentRank) {
    return { segment: computedSegment, demotionStreak: 0 }
  }

  // Demotion: increment streak, only apply when threshold reached
  const newStreak = demotionStreak + 1
  if (newStreak >= HYSTERESIS_K) {
    return { segment: computedSegment, demotionStreak: 0 }
  }
  return { segment: currentSegment, demotionStreak: newStreak }
}

/**
 * Process a single profile's session stats: look up existing summary,
 * compute segment with hysteresis, and upsert the result.
 */
async function processProfileStats(
  tx: Prisma.TransactionClient,
  row: { profileId: string; activeDays28: number; sessions28: number; lastSessionAt: Date },
  now: Date
): Promise<void> {
  const existing = await tx.profileActivitySummary.findUnique({
    where: { profileId: row.profileId },
  })

  const firstSeenAt = existing?.firstSeenAt ?? row.lastSessionAt
  const lastSeenAt =
    row.lastSessionAt > (existing?.lastSeenAt ?? new Date(0))
      ? row.lastSessionAt
      : existing!.lastSeenAt

  const rawSegment = computeRawSegment(lastSeenAt, row.activeDays28, now)
  const currentSegment = existing?.segment ?? 'dormant'
  const currentStreak = existing?.demotionStreak ?? 0

  const { segment, demotionStreak } = applyHysteresis(currentSegment, rawSegment, currentStreak)
  const segmentChanged = segment !== currentSegment

  await tx.profileActivitySummary.upsert({
    where: { profileId: row.profileId },
    create: {
      profileId: row.profileId,
      firstSeenAt,
      lastSeenAt,
      activeDays28: row.activeDays28,
      sessions28: row.sessions28,
      segment,
      demotionStreak,
      segmentUpdatedAt: now,
    },
    update: {
      lastSeenAt,
      activeDays28: row.activeDays28,
      sessions28: row.sessions28,
      segment,
      demotionStreak,
      ...(segmentChanged ? { segmentUpdatedAt: now } : {}),
    },
  })
}

/**
 * Run the full distillation process for all profiles with recent activity.
 */
export async function distillActivitySegments(): Promise<void> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  // 1. Aggregate session data for profiles with activity in the 28-day window.
  //    Uses raw SQL for the DATE-distinct count which Prisma can't express natively.
  const stats: Array<{
    profileId: string
    activeDays28: number
    sessions28: number
    lastSessionAt: Date
  }> = await prisma.$queryRaw`
    SELECT
      "profileId",
      COUNT(DISTINCT DATE("startedAt"))::int AS "activeDays28",
      COUNT(*)::int AS "sessions28",
      MAX("startedAt") AS "lastSessionAt"
    FROM "ProfileSessionLog"
    WHERE "startedAt" >= ${windowStart}
    GROUP BY "profileId"
  `

  await prisma.$transaction(async (tx) => {
    // 2. Process profiles in batches (concurrent within batch, sequential between batches)
    for (let i = 0; i < stats.length; i += BATCH_SIZE) {
      const batch = stats.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map((row) => processProfileStats(tx, row, now)))
    }

    // 3. Dormant sweep: mark profiles whose lastSeenAt is stale and who aren't already dormant
    const dormantThreshold = new Date(now.getTime() - DORMANT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)
    await tx.profileActivitySummary.updateMany({
      where: {
        lastSeenAt: { lt: dormantThreshold },
        segment: { not: 'dormant' },
      },
      data: {
        segment: 'dormant',
        demotionStreak: 0,
        segmentUpdatedAt: now,
      },
    })

    // 4. Cleanup: delete session logs older than the retention window
    await tx.profileSessionLog.deleteMany({
      where: { startedAt: { lt: windowStart } },
    })
  })
}
