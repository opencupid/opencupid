import {
  OwnerEventSchema,
  type PublicEvent,
  type PublicEventDetail,
  type OwnerEvent,
} from '@zod/event/event.dto'
import type { EventWithMetadata, EventWithMetadataAndContext } from '@/services/event.service'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { extractLocation } from './location.mappers'
import { toOwnerImage, toPublicImage } from './image.mappers'

export function mapDbEventToPublic(row: EventWithMetadata, viewerProfileId: string): PublicEvent {
  return {
    id: row.id,
    kind: 'event',
    startsAt: row.event!.startsAt,
    venue: row.event!.venue,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
    images: row.images.map((j) => toPublicImage(j.image)),
  }
}

export function mapDbEventToDetail(
  row: EventWithMetadataAndContext,
  viewerProfileId: string
): PublicEventDetail {
  return {
    id: row.id,
    kind: 'event',
    startsAt: row.event!.startsAt,
    venue: row.event!.venue,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: false,
    postedBy: {
      ...mapProfileSummary(row.postedBy),
      ...mapConversationContext(row.postedBy, viewerProfileId),
    },
    location: extractLocation(row) ?? undefined,
    images: row.images.map((j) => toPublicImage(j.image)),
  }
}

export function mapDbEventToOwner(row: EventWithMetadata): OwnerEvent {
  return OwnerEventSchema.parse({
    id: row.id,
    kind: 'event',
    startsAt: row.event!.startsAt,
    venue: row.event!.venue,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: row.isDeleted,
    isVisible: row.isVisible,
    isOwn: true,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
    images: row.images.map((j) => toOwnerImage(j.image)),
  })
}
