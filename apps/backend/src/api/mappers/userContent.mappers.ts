import type { DbProfileSummary, DbProfileWithContext } from '@zod/profile/profile.db'
import {
  PublicUserContentSchema,
  type PublicUserContentWithProfile,
  type PublicUserContentDetail,
  type UserContentSummary,
} from '@zod/userContent/userContent.dto'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { DbLocationToLocationDTO, extractLocation } from './location.mappers'

/** Minimum row shape any concrete UserContent row must satisfy for the public/owner mappers. */
export type DbUserContentRow = {
  id: string
  content: string
  isDeleted: boolean
  isVisible: boolean
  createdAt: Date
  updatedAt: Date
  country: string | null
  cityName: string | null
  lat: number | null
  lon: number | null
  postedById: string
  postedBy: DbProfileSummary
}

/** Row shape for the detail mapper — postedBy carries conversation-context hydration. */
export type DbUserContentRowWithContext = Omit<DbUserContentRow, 'postedBy'> & {
  postedBy: DbProfileSummary & Pick<DbProfileWithContext, 'conversationAsA' | 'conversationAsB'>
}

/** Lightweight row for the summary projection (no profile images, minimal profile). */
export type DbUserContentForSummary = {
  id: string
  content: string
  country: string | null
  cityName: string | null
  lat: number | null
  lon: number | null
  postedBy: DbProfileSummary
}

/**
 * Public projection — base for any "PublicXWithProfile" wire shape.
 * Matches the Post mapper convention: partial Zod parse on the shared
 * UserContent fields, then unparsed overlay (isOwn, postedBy, location).
 * Caller attaches type-specific fields after this projection.
 */
export function projectPublicUserContent<T extends DbUserContentRow>(
  row: T,
  viewerProfileId: string,
): Omit<PublicUserContentWithProfile, never> {
  const { postedBy, ...rest } = row
  return {
    ...PublicUserContentSchema.parse(rest),
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(postedBy),
    location: extractLocation(rest),
  }
}

/**
 * Detail projection — adds conversation context to postedBy.
 * `isOwn` is hardcoded `false` because detail is only requested by non-owners
 * (the owner branch in the GET /:id route uses the owner mapper).
 */
export function projectDetailUserContent<T extends DbUserContentRowWithContext>(
  row: T,
  viewerProfileId: string,
): Omit<PublicUserContentDetail, never> {
  const { postedBy, ...rest } = row
  return {
    ...PublicUserContentSchema.parse(rest),
    isOwn: false,
    postedBy: {
      ...mapProfileSummary(postedBy),
      ...mapConversationContext(postedBy, viewerProfileId),
    },
    location: extractLocation(rest),
  }
}

/**
 * Owner projection — returns the unparsed structural intermediate; the caller's
 * wire schema (`OwnerPostSchema` / `OwnerEventSchema`) does the final parse.
 * Mirrors the existing `OwnerPostSchema.parse(mapped)` placement.
 */
export function projectOwnerUserContent<T extends DbUserContentRow>(row: T) {
  const { postedBy, ...rest } = row
  return {
    ...rest,
    postedBy: mapProfileSummary(postedBy),
    location: extractLocation(rest),
  }
}

/** Summary projection for /search omnibox / map teaser layers. */
export function projectUserContentSummary<T extends DbUserContentForSummary>(
  row: T,
): Omit<UserContentSummary, never> {
  return {
    id: row.id,
    content: row.content,
    location: DbLocationToLocationDTO(row),
    postedBy: mapProfileSummary(row.postedBy),
  }
}
