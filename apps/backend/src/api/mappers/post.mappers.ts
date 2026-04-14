import {
  OwnerPostSchema,
  PublicPostSchema,
  type PostWithProfile,
  type PublicPostWithProfile,
  type PublicPostDetail,
  type OwnerPost,
} from '@zod/post/post.dto'
import type { PostWithProfileAndContext } from '@/services/post.service'
import type { LocationDTO } from '@zod/dto/location.dto'
import type { PostSummary } from '@zod/search/search.dto'
import type { DbProfileSummary } from '@zod/profile/profile.db'
import type { PostType } from '@prisma/client'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'

function extractPostLocation(post: Record<string, unknown>): LocationDTO | null {
  if (!post.country && !post.cityName && post.lat == null && post.lon == null) {
    return null
  }
  return {
    country: (post.country as string) ?? '',
    cityName: (post.cityName as string) ?? undefined,
    lat: (post.lat as number) ?? null,
    lon: (post.lon as number) ?? null,
  }
}

export function mapDbPostToPublic(
  post: PostWithProfile,
  viewerProfileId: string
): PublicPostWithProfile {
  const { postedBy, ...rest } = post
  return {
    ...PublicPostSchema.parse(rest),
    isOwn: post.postedById === viewerProfileId,
    postedBy: mapProfileSummary(postedBy),
    location: extractPostLocation(rest),
  }
}

export function mapDbPostToDetail(post: PostWithProfileAndContext): PublicPostDetail {
  const { postedBy, ...rest } = post
  return {
    ...PublicPostSchema.parse(rest),
    isOwn: false,
    postedBy: {
      ...mapProfileSummary(postedBy),
      ...mapConversationContext(postedBy),
    },
    location: extractPostLocation(rest),
  }
}

export function mapDbPostToOwner(post: PostWithProfile): OwnerPost {
  const { postedBy, ...rest } = post
  const mapped = {
    ...rest,
    postedBy: mapProfileSummary(postedBy),
    location: extractPostLocation(rest),
  }
  return OwnerPostSchema.parse(mapped)
}

/** Input shape for `mapPostSummary` — what the search query hydrates. */
export type DbPostForSummary = {
  id: string
  type: PostType
  content: string
  postedBy: DbProfileSummary
}

/** Lightweight post mapper used by /search omnibox results. */
export function mapPostSummary(post: DbPostForSummary): PostSummary {
  return {
    id: post.id,
    type: post.type,
    content: post.content,
    postedBy: mapProfileSummary(post.postedBy),
  }
}
