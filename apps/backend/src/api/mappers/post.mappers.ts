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

// TODO(post-mappers) #1446: the input types here are tighter than callers can
// satisfy without `as any`, in two flavors:
//   (1) Detail routes load `PostWithMetadataAndContext` (has conversation
//       context fields) and pass it to `mapDbPostToOwner`, whose declared
//       input is the narrower `PostWithMetadata`. The runtime is fine —
//       owner mapping just ignores the extra fields — but Prisma's
//       include-derived types don't structurally extend cleanly so TS
//       can't accept the wider shape. Fix: widen `mapDbPostToOwner` /
//       `mapDbPostToPublic` to accept either include shape (union or a
//       structural subset type).
//   (2) `findByProfileIdHydrated` returns `PostWithMetadata[]` (no
//       context), but the non-owner branch in /content/posts/profile/:id
//       calls `mapDbPostToDetail` which expects the with-context payload.
//       The cast hides a real shape mismatch — `mapConversationContext`
//       happens to no-op on undefined, but that's an implicit contract.
//       Fix: either route profile-list non-owner views through a
//       context-less mapper (e.g. `mapDbPostToPublic`), or have the
//       service load the with-context include for that path.
// Same shape applies to `event.mappers.ts`. Tracked together; expect a
// single follow-up PR to land both.
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
