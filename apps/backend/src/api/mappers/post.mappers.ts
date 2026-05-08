import {
  OwnerPostSchema,
  type PublicPost,
  type PublicPostDetail,
  type OwnerPost,
  type PostSummary,
} from '@zod/post/post.dto'
import type { PostWithMetadata, PostWithMetadataAndContext } from '@/services/post.service'
import type { DbProfileSummary } from '@zod/profile/profile.db'
import type { PostType } from '@prisma/client'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { DbLocationToLocationDTO, extractLocation } from './location.mappers'

export function mapDbPostToPublic(row: PostWithMetadata, viewerProfileId: string): PublicPost {
  return {
    id: row.id,
    kind: 'post',
    type: row.post!.type,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
  }
}

export function mapDbPostToDetail(
  row: PostWithMetadataAndContext,
  viewerProfileId: string
): PublicPostDetail {
  return {
    id: row.id,
    kind: 'post',
    type: row.post!.type,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: false,
    postedBy: {
      ...mapProfileSummary(row.postedBy),
      ...mapConversationContext(row.postedBy, viewerProfileId),
    },
    location: extractLocation(row) ?? undefined,
  }
}

export function mapDbPostToOwner(row: PostWithMetadata): OwnerPost {
  return OwnerPostSchema.parse({
    id: row.id,
    kind: 'post',
    type: row.post!.type,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: row.isDeleted,
    isVisible: row.isVisible,
    isOwn: true,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
  })
}

/** Input shape for `mapPostSummary` — what the search query hydrates. */
export type DbPostForSummary = {
  id: string
  kind: 'post'
  content: string
  country: string | null
  cityName: string | null
  lat: number | null
  lon: number | null
  postedBy: DbProfileSummary
  post: { type: PostType }
}

/** Lightweight post mapper used by /search omnibox results. */
export function mapPostSummary(row: DbPostForSummary): PostSummary {
  return {
    id: row.id,
    kind: 'post',
    type: row.post.type,
    content: row.content,
    location: DbLocationToLocationDTO(row),
    postedBy: mapProfileSummary(row.postedBy),
  }
}
