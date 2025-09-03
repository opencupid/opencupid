
import type { Prisma } from "@prisma/client"
import { mapProfileSummary } from "./profile.mappers"
import type { PublicPostWithProfile } from "@zod/post/post.dto"

export function mapPostWithProfile(post: PublicPostWithProfile): PublicPostWithProfile {
  const { postedBy, ...rest } = post
  return {
    postedBy: mapProfileSummary(postedBy),
    ...rest
  }
}