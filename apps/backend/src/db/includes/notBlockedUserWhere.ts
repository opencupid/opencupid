import { type Prisma } from '@prisma/client'

/**
 * Profile filter excluding profiles whose user account is admin-blocked.
 * Apply to every query listing other people's profiles or content
 * (as `postedBy` for UserContent) so blocked users are hidden everywhere.
 *
 * Not covered by this helper:
 * - search.service.ts uses raw SQL and repeats the condition as
 *   `u."isBlocked" = false` — keep the two in sync.
 * - Lookups of one specific profile or its content (the public profile page
 *   and its content list) don't apply it, so a blocked user's profile is
 *   still reachable by direct link.
 * - Profile.isBlocked and User.isActive are separate flags and aren't
 *   checked here.
 */
export const notBlockedUserWhere = {
  user: { isBlocked: false },
} satisfies Prisma.ProfileWhereInput
