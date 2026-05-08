import type { LeanContentRow } from '@/services/userContent.service'
import { mapProfileSummary } from './profile.mappers'
import { extractLocation } from './location.mappers'
import type { LeanUserContent } from '@zod/userContent/userContent.dto'

export function mapLeanContent(row: LeanContentRow, viewerProfileId: string): LeanUserContent {
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
