import {
  OwnerPostSchema,
  PublicPostSchema,
  type PostWithProfile,
  type PublicPostWithProfile,
  type OwnerPost,
} from '@zod/post/post.dto'
import type { ProfileSummary } from '@zod/profile/profile.dto'
import { mapProfileSummary } from './profile.mappers'

export type OwnerPostWithProfile = OwnerPost & {
  postedBy: ProfileSummary
  location?: {
    country: string | null
    cityName: string | null
    lat: number | null
    lon: number | null
  } | null
  isOwn?: boolean
}

function extractPostLocation(post: Record<string, unknown>) {
  if (!post.country && !post.cityName && post.lat == null && post.lon == null) {
    return null
  }
  return {
    country: (post.country as string) ?? null,
    cityName: (post.cityName as string) ?? null,
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
