import z from 'zod'
import { ProfileSummarySchema } from '../profile/profile.dto'
import { PublicTagSchema } from '../tag/tag.dto'
import { PostSummarySchema } from '../post/post.dto'
import { EventSummarySchema } from '../event/event.dto'
import { CommunitySummarySchema } from '../community/community.dto'

/** Query-string schema for GET /search. */
export const SearchQuerySchema = z.object({
  q: z.string().default(''),
})

export type SearchQuery = z.infer<typeof SearchQuerySchema>

// Location suggestions are sourced from Photon on the client
// (see features/geocoding/composables/useGeocoder), so they don't appear in this response.
export const SearchResponseSchema = z.object({
  success: z.literal(true),
  tags: z.array(PublicTagSchema),
  profiles: z.array(ProfileSummarySchema),
  posts: z.array(PostSummarySchema),
  events: z.array(EventSummarySchema),
  communities: z.array(CommunitySummarySchema),
})

export type SearchResponse = z.infer<typeof SearchResponseSchema>

/** Minimum query length after server-side trim/collapse; below → empty results. */
export const SEARCH_MIN_QUERY_LENGTH = 2

/** Per-category result caps. */
export const SEARCH_TAG_LIMIT = 5
export const SEARCH_PROFILE_LIMIT = 10
export const SEARCH_POST_LIMIT = 10
export const SEARCH_EVENT_LIMIT = 10
export const SEARCH_COMMUNITY_LIMIT = 10
