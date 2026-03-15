import {
  OwnerPostSchema,
  PublicPostSchema,
  type PostWithProfile,
  type PublicPostWithProfile,
  type OwnerPost,
} from '@zod/post/post.dto'
import type { LocationDTO } from '@zod/dto/location.dto'
import { mapProfileSummary } from './profile.mappers'

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

export function mapDbPostToOwner(post: PostWithProfile): OwnerPost {
  const { postedBy, ...rest } = post
  const mapped = {
    ...rest,
    postedBy: mapProfileSummary(postedBy),
    location: extractPostLocation(rest),
  }
  return OwnerPostSchema.parse(mapped)
}
