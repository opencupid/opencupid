import {
  OwnerEventSchema,
  type PublicEvent,
  type PublicEventDetail,
  type OwnerEvent,
} from '@zod/event/event.dto'
import type { EventWithExtension, EventWithExtensionAndContext } from '@/services/event.service'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { extractLocation } from './location.mappers'

export function mapDbEventToPublic(
  row: EventWithExtension,
  viewerProfileId: string
): PublicEvent {
  return {
    id: row.id,
    kind: 'event',
    startsAt: row.event!.startsAt,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
  }
}

export function mapDbEventToDetail(
  row: EventWithExtensionAndContext,
  viewerProfileId: string
): PublicEventDetail {
  return {
    id: row.id,
    kind: 'event',
    startsAt: row.event!.startsAt,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: false,
    postedBy: {
      ...mapProfileSummary(row.postedBy),
      ...mapConversationContext(row.postedBy, viewerProfileId),
    },
    location: extractLocation(row) ?? undefined,
  }
}

export function mapDbEventToOwner(row: EventWithExtension): OwnerEvent {
  return OwnerEventSchema.parse({
    id: row.id,
    kind: 'event',
    startsAt: row.event!.startsAt,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: row.isDeleted,
    isVisible: row.isVisible,
    isOwn: true,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
  })
}
