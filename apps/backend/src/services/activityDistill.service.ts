import { ActivitySegment, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Tunable constants (could be made configurable if needed)
const DORMANT_THRESHOLD_DAYS = 14
const RETURNING_MIN_ACTIVE_DAYS = 2
const FREQUENT_MIN_ACTIVE_DAYS = 8
const HYSTERESIS_K = 2
const RETENTION_DAYS = 28
/** Accounts younger than this are 'new'; older ones that are active again are 'returning'. */
const NEW_ACCOUNT_MAX_DAYS = 28
const BATCH_SIZE = 10
const DAY_MS = 24 * 60 * 60 * 1000

/** Ordered from highest to lowest priority for comparison. */
const SEGMENT_RANK: Record<ActivitySegment, number> = {
  frequent: 3,
  returning: 2,
  new: 1,
  dormant: 0,
}

/**
 * Compute the raw segment from summary stats (before hysteresis).
 * `accountCreatedAt` is Profile.createdAt: a profile is created at the user's
 * first login, so it is when the profile was first seen.
 */
export function computeRawSegment(
  lastSeenAt: Date,
  activeDays28: number,
  accountCreatedAt: Date,
  now: Date
): ActivitySegment {
  const daysSinceLastSeen = (now.getTime() - lastSeenAt.getTime()) / DAY_MS

  // Highest priority: dormant if not seen in 14+ days
  if (daysSinceLastSeen >= DORMANT_THRESHOLD_DAYS) return 'dormant'

  // Frequent: 8+ active days in last 28d
  if (activeDays28 >= FREQUENT_MIN_ACTIVE_DAYS) return 'frequent'

  // Returning: visited on 2+ distinct days, or active again on an account
  // older than the window (e.g. back from dormant): either way, came back.
  const accountAgeDays = (now.getTime() - accountCreatedAt.getTime()) / DAY_MS
  if (activeDays28 >= RETURNING_MIN_ACTIVE_DAYS || accountAgeDays >= NEW_ACCOUNT_MAX_DAYS)
    return 'returning'

  // New: a recent account with a single active day so far
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

type ProfileStats = {
  profileId: string
  activeDays28: number
  sessions28: number
  lastSessionAt: Date
  accountCreatedAt: Date
}

/**
 * Process a single profile's session stats: look up existing summary,
 * compute segment with hysteresis, and upsert the result. lastSeenAt is kept
 * current by recordActivity and only read here.
 */
async function processProfileStats(
  tx: Prisma.TransactionClient,
  row: ProfileStats,
  now: Date
): Promise<void> {
  const existing = await tx.profileActivitySummary.findUnique({
    where: { profileId: row.profileId },
  })

  const lastSeenAt = existing?.lastSeenAt ?? row.lastSessionAt

  const rawSegment = computeRawSegment(lastSeenAt, row.activeDays28, row.accountCreatedAt, now)
  const currentSegment = existing?.segment ?? 'dormant'
  const currentStreak = existing?.demotionStreak ?? 0

  const { segment, demotionStreak } = applyHysteresis(currentSegment, rawSegment, currentStreak)
  const segmentChanged = segment !== currentSegment

  await tx.profileActivitySummary.upsert({
    where: { profileId: row.profileId },
    create: {
      profileId: row.profileId,
      lastSeenAt,
      activeDays28: row.activeDays28,
      sessions28: row.sessions28,
      segment,
      demotionStreak,
      segmentUpdatedAt: now,
    },
    update: {
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
  const stats: ProfileStats[] = await prisma.$queryRaw`
    SELECT
      s."profileId",
      COUNT(DISTINCT DATE(s."startedAt"))::int AS "activeDays28",
      COUNT(*)::int AS "sessions28",
      MAX(s."startedAt") AS "lastSessionAt",
      p."createdAt" AS "accountCreatedAt"
    FROM "ProfileSessionLog" s
    JOIN "Profile" p ON p."id" = s."profileId"
    WHERE s."startedAt" >= ${windowStart}
    GROUP BY s."profileId", p."createdAt"
  `

  // 2. Process profiles in per-batch transactions (sequential within each to
  //    avoid concurrent queries on a single Prisma interactive transaction client)
  for (let i = 0; i < stats.length; i += BATCH_SIZE) {
    const batch = stats.slice(i, i + BATCH_SIZE)
    await prisma.$transaction(async (tx) => {
      for (const row of batch) {
        await processProfileStats(tx, row, now)
      }
    })
  }

  // 3. Dormant sweep + cleanup in a single short transaction
  await prisma.$transaction(async (tx) => {
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

    await tx.profileSessionLog.deleteMany({
      where: { startedAt: { lt: windowStart } },
    })
  })
}
