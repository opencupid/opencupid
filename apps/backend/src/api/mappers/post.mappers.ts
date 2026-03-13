import {
  OwnerPostSchema,
  PublicPostSchema,
  type PostWithProfile,
  type PublicPostWithProfile,
  type OwnerPost,
} from '@zod/post/post.dto'
import type { ProfileSummary } from '@zod/profile/profile.dto'
import type { LocationDTO } from '@zod/dto/location.dto'
import { mapProfileSummary } from './profile.mappers'

export type OwnerPostWithProfile = OwnerPost & {
  postedBy: ProfileSummary
  location?: LocationDTO | null
  isOwn?: boolean
}

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
    isOwn: post.postedById === viewerProfileId,
    postedBy: mapProfileSummary(postedBy),
    ...PublicPostSchema.parse(rest),
    location: extractPostLocation(rest),
  }
}

export function mapDbPostToOwner(post: PostWithProfile): OwnerPostWithProfile {
  const { postedBy, ...rest } = post
  return {
    postedBy: mapProfileSummary(postedBy),
    ...OwnerPostSchema.parse(rest),
    location: extractPostLocation(rest),
  }
}
