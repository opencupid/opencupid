import { Prisma } from '@prisma/client'

const INTRO_FIELDS = ['introSocial', 'introDating']

/**
 * Whether a profile belongs hidden from results: no face photo and no intro
 * in any language. Intros are trimmed on input, so blank means ''. Call it
 * after writing the intro fields, in the same transaction, and store the
 * result in the same update that writes hasFace or the profile scalars.
 */
export async function computeHiddenFromResults(
  tx: Prisma.TransactionClient,
  profileId: string,
  hasFace: boolean
): Promise<boolean> {
  if (hasFace) return false
  const intro = await tx.localizedProfileField.findFirst({
    where: { profileId, field: { in: INTRO_FIELDS }, value: { not: '' } },
    select: { id: true },
  })
  return intro === null
}
