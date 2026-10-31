import { z } from 'zod'
import { PublicProfileSchema } from '../profile/profile.dto'
import { OwnerPostSchema, PublicPostDetailSchema } from '../post/post.dto'
import { OwnerEventSchema, PublicEventDetailSchema } from '../event/event.dto'
import { OwnerCommunitySchema, PublicCommunityDetailSchema } from '../community/community.dto'

/** Default and maximum page sizes for the browse grid list. */
export const BROWSE_LIST_DEFAULT_LIMIT = 24
export const BROWSE_LIST_MAX_LIMIT = 100

const distanceKm = z.number().nonnegative()

/**
 * One grid entry. Hydrated with the same DTOs the map popups and detail
 * routes use, so the grid can render the existing popup cards directly.
 * Content the viewer posted comes back in its owner shape, as on the detail
 * routes.
 */
export const BrowseListItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('profile'), distanceKm, profile: PublicProfileSchema }),
  z.object({
    kind: z.literal('post'),
    distanceKm,
    post: z.union([OwnerPostSchema, PublicPostDetailSchema]),
  }),
  z.object({
    kind: z.literal('event'),
    distanceKm,
    event: z.union([OwnerEventSchema, PublicEventDetailSchema]),
  }),
  z.object({
    kind: z.literal('community'),
    distanceKm,
    community: z.union([OwnerCommunitySchema, PublicCommunityDetailSchema]),
  }),
])
export type BrowseListItem = z.infer<typeof BrowseListItemSchema>

export const BrowseListResponseSchema = z.object({
  success: z.literal(true),
  /** Number of items inside the requested bounds (all pages). */
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  items: z.array(BrowseListItemSchema),
})
export type BrowseListResponse = z.infer<typeof BrowseListResponseSchema>
