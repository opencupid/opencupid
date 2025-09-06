
import { OwnerPostSchema, PublicPostSchema, type PostWithProfile, type PublicPostWithProfile } from "@zod/post/post.dto"
import { mapProfileSummary } from "./profile.mappers"



export function mapDbPostToPublic(post: PostWithProfile): PublicPostWithProfile {
  const { postedBy, ...rest } = post
  return {
    postedBy: mapProfileSummary(postedBy),
    ...PublicPostSchema.parse(rest),
  }
}


export function mapDbPostToOwner(post: PostWithProfile): PublicPostWithProfile {
  const { postedBy, ...rest } = post
  return {
    postedBy: mapProfileSummary(postedBy),
    ...OwnerPostSchema.parse(rest),
  }
}


