import type { LeanContentRow, LeanContentRowWithContext } from '@/services/userContent.service'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { extractLocation } from './location.mappers'
import type { LeanUserContent } from '@zod/userContent/userContent.dto'

export function mapLeanContent(
  row: LeanContentRow,
  viewerProfileId: string
): LeanUserContent {
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

export function mapLeanContentDetail(
  row: LeanContentRowWithContext,
  viewerProfileId: string
) {
  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: {
      ...mapProfileSummary(row.postedBy),
      ...mapConversationContext(row.postedBy, viewerProfileId),
    },
    location: extractLocation(row) ?? undefined,
  }
}
