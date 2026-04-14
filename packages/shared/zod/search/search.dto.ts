import z from 'zod'
import { ProfileSummarySchema } from '../profile/profile.dto'
import { PublicTagSchema } from '../tag/tag.dto'
import { PostSummarySchema } from '../post/post.dto'
import { LocationSchema } from '../dto/location.dto'

/** Grouped search results — one bucket per content kind. */
export const SearchResponseSchema = z.object({
  success: z.literal(true),
  tags: z.array(PublicTagSchema),
  profiles: z.array(ProfileSummarySchema),
  posts: z.array(PostSummarySchema),
  locations: z.array(LocationSchema),
})

export type SearchResponse = z.infer<typeof SearchResponseSchema>

/** Minimum query length after server-side trim/collapse; below → empty results. */
export const SEARCH_MIN_QUERY_LENGTH = 2

/** Per-category result caps. */
export const SEARCH_TAG_LIMIT = 5
export const SEARCH_PROFILE_LIMIT = 10
export const SEARCH_POST_LIMIT = 10
export const SEARCH_LOCATION_LIMIT = 5
