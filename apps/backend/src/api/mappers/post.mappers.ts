
import type { OwnerPost, PublicPostWithProfile } from "@zod/post/post.dto"
import { mapProfileSummary } from "./profile.mappers"

export function mapPostWithProfile(post: PublicPostWithProfile): PublicPostWithProfile {
  const { postedBy, ...rest } = post
  return {
    // postedBy is already a ProfileSummary shape; no remapping needed
    postedBy,
    ...rest
  }
}

export function mapDbPostToPublic(post: PublicPostWithProfile): PublicPostWithProfile {
  const { postedBy, ...rest } = post
  return {
    postedBy: mapProfileSummary(postedBy),
    ...rest
  }
}


