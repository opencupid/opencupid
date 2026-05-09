import type { UserContentMetadataRow } from '@/services/userContent.service'
import { mapProfileSummary } from './profile.mappers'
import { extractLocation } from './location.mappers'
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'

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
