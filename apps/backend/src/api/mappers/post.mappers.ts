import {
  OwnerPostSchema,
  PublicPostSchema,
  type PostWithProfile,
  type PublicPostWithProfile,
  type PublicPostDetail,
  type OwnerPost,
  type PostSummary,
} from '@zod/post/post.dto'
import type { PostWithProfileAndContext } from '@/services/post.service'
import type { DbProfileSummary } from '@zod/profile/profile.db'
import type { PostType } from '@prisma/client'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { DbLocationToLocationDTO, extractLocation } from './location.mappers'

export function mapDbPostToPublic(
  post: PostWithProfile,
  viewerProfileId: string
): PublicPostWithProfile {
  const { postedBy, ...rest } = post
  return {
    ...PublicPostSchema.parse(rest),
    isOwn: post.postedById === viewerProfileId,
    postedBy: mapProfileSummary(postedBy),
    location: extractLocation(rest),
  }
}

export function mapDbPostToDetail(
  post: PostWithProfileAndContext,
  viewerProfileId: string
): PublicPostDetail {
  const { postedBy, ...rest } = post
  return {
    ...PublicPostSchema.parse(rest),
    isOwn: false,
    postedBy: {
      ...mapProfileSummary(postedBy),
      ...mapConversationContext(postedBy, viewerProfileId),
    },
    location: extractLocation(rest),
  }
}

export function mapDbPostToOwner(post: PostWithProfile): OwnerPost {
  const { postedBy, ...rest } = post
  const mapped = {
    ...rest,
    postedBy: mapProfileSummary(postedBy),
    location: extractLocation(rest),
  }
  return OwnerPostSchema.parse(mapped)
}

/** Input shape for `mapPostSummary` — what the search query hydrates. */
export type DbPostForSummary = {
  id: string
  type: PostType
  content: string
  country: string | null
  cityName: string | null
  lat: number | null
  lon: number | null
  postedBy: DbProfileSummary
}

/** Lightweight post mapper used by /search omnibox results. */
export function mapPostSummary(post: DbPostForSummary): PostSummary {
  return {
    id: post.id,
    type: post.type,
    content: post.content,
    location: DbLocationToLocationDTO(post),
    postedBy: mapProfileSummary(post.postedBy),
  }
}
