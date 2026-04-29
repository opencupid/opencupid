import {
  OwnerPostSchema,
  type PostWithProfile,
  type PublicPostWithProfile,
  type PublicPostDetail,
  type OwnerPost,
  type PostSummary,
} from '@zod/post/post.dto'
import type { PostWithProfileAndContext } from '@/services/post.service'
import type { PostType } from '@prisma/client'
import {
  projectPublicUserContent,
  projectDetailUserContent,
  projectOwnerUserContent,
  projectUserContentSummary,
  type DbUserContentForSummary,
} from './userContent.mappers'

export function mapDbPostToPublic(
  post: PostWithProfile,
  viewerProfileId: string
): PublicPostWithProfile {
  return {
    ...projectPublicUserContent(post, viewerProfileId),
    type: post.type,
  }
}

export function mapDbPostToDetail(
  post: PostWithProfileAndContext,
  viewerProfileId: string
): PublicPostDetail {
  return {
    ...projectDetailUserContent(post, viewerProfileId),
    type: post.type,
  }
}

export function mapDbPostToOwner(post: PostWithProfile): OwnerPost {
  return OwnerPostSchema.parse({
    ...projectOwnerUserContent(post),
    type: post.type,
  })
}

/** Input shape for `mapPostSummary` — what the search query hydrates. */
export type DbPostForSummary = DbUserContentForSummary & {
  type: PostType
}

/** Lightweight post mapper used by /search omnibox and /bounds map results. */
export function mapPostSummary(post: DbPostForSummary): PostSummary {
  return {
    ...projectUserContentSummary(post),
    type: post.type,
  }
}
