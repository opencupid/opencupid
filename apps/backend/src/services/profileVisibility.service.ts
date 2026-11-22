import { Prisma } from '@prisma/client'

/**
 * Recalculates Profile.isHiddenFromResults for one profile in both directions.
 * A profile is hidden when it has no face photo and no intro in any language.
 * Call it in the same transaction as any write to hasFace or the intro fields,
 * after those writes.
 *
 * Raw SQL so that "updatedAt" stays unchanged: it sets the browse order.
 */
export async function syncProfileHiddenFromResults(
  tx: Prisma.TransactionClient,
  profileId: string
): Promise<void> {
  await tx.$executeRaw`
    UPDATE "Profile" p
    SET "isHiddenFromResults" = NOT p."hasFace" AND NOT EXISTS (
      SELECT 1 FROM "LocalizedProfileField" f
      WHERE f."profileId" = p."id"
        AND f."field" IN ('introSocial', 'introDating')
        AND btrim(f."value") <> ''
    )
    WHERE p."id" = ${profileId}
  `
}
