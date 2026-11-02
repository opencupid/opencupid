import { type Prisma } from '@prisma/client'

/**
 * Profile filter excluding profiles whose user account is admin-blocked.
 * Apply to every query listing other people's profiles or content
 * (as `postedBy` for UserContent) so blocked users are hidden everywhere.
 */
export const notBlockedUserWhere = {
  user: { isBlocked: false },
} satisfies Prisma.ProfileWhereInput
