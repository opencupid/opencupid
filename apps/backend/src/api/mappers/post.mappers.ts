
import { OwnerPostSchema, PublicPostSchema, type PostWithProfile, type PublicPostWithProfile } from "@zod/post/post.dto"
import { mapProfileSummary } from "./profile.mappers"


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

export function mapDbPostToPublic(post: PostWithProfile, viewerProfileId: string): PublicPostWithProfile {
  const { postedBy, ...rest } = post
  return {
    isOwn: post.postedById === viewerProfileId,
    postedBy: mapProfileSummary(postedBy),
    ...PublicPostSchema.parse(rest),
    location: extractPostLocation(rest),
  }
}


export function mapDbPostToOwner(post: PostWithProfile): PublicPostWithProfile {
  const { postedBy, ...rest } = post
  return {
    postedBy: mapProfileSummary(postedBy),
    ...OwnerPostSchema.parse(rest),
    location: extractPostLocation(rest),
  }
}
