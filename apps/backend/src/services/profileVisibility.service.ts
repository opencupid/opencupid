import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const HIDE_AFTER_DAYS_UNSEEN = 5

/**
 * Recalculates Profile.isHiddenFromResults in both directions. A profile is
 * hidden when it has no face photo, no intro in any language, and has not been
 * seen for HIDE_AFTER_DAYS_UNSEEN days. Profiles with no activity summary have
 * no known last-seen date, so they stay visible.
 *
 * Raw SQL so that "updatedAt" stays unchanged: it sets the browse order.
 */
export async function syncHiddenFromResults(now: Date = new Date()): Promise<void> {
  const unseenSince = new Date(now.getTime() - HIDE_AFTER_DAYS_UNSEEN * 24 * 60 * 60 * 1000)

  const changed = await prisma.$executeRaw`
    WITH desired AS (
      SELECT
        pr."id",
        (
          NOT pr."hasFace"
          AND EXISTS (
            SELECT 1 FROM "ProfileActivitySummary" s
            WHERE s."profileId" = pr."id" AND s."lastSeenAt" < ${unseenSince}
          )
          AND NOT EXISTS (
            SELECT 1 FROM "LocalizedProfileField" f
            WHERE f."profileId" = pr."id"
              AND f."field" IN ('introSocial', 'introDating')
              AND btrim(f."value") <> ''
          )
        ) AS hide
      FROM "Profile" pr
    )
    UPDATE "Profile" p
    SET "isHiddenFromResults" = d.hide
    FROM desired d
    WHERE p."id" = d."id" AND p."isHiddenFromResults" <> d.hide
  `
  logger.info({ changed }, 'profile visibility synced')
}
