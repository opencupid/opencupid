import type { OwnerHydratedRow, UserContentMetadataRow } from '@/services/userContent.service'
import { mapProfileSummary } from './profile.mappers'
import { extractLocation } from './location.mappers'
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'
import { mapDbPostToOwner } from './post.mappers'
import { mapDbEventToOwner } from './event.mappers'
import { mapDbCommunityToOwner } from './community.mappers'

export function mapUserContentMetadata(
  row: UserContentMetadataRow,
  viewerProfileId: string
): UserContentMetadata {
  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
  }
}

/**
 * Maps an owner-hydrated row (UserContent + all kind-specific content rows
 * + profile summary loaded eagerly) to the discriminated OwnerUserContent
 * union. Dispatches by `row.kind` and delegates to the per-kind owner mapper.
 */
export function mapOwnerUserContent(row: OwnerHydratedRow): OwnerUserContent {
  switch (row.kind) {
    case 'post':
      return mapDbPostToOwner(row)
    case 'event':
      return mapDbEventToOwner(row)
    case 'community':
      return mapDbCommunityToOwner(row)
  }
}
