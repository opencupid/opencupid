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

// TODO(event-mappers) #1446: same `as any` pattern as post.mappers.ts — see the
// long-form explanation there. Two flavors of cast at call sites:
// (1) wide → narrow (detail routes pass with-context payload to
// `mapDbEventToOwner`), (2) narrow → wide (profile-list non-owner branch
// passes context-less rows to `mapDbEventToDetail`, relying on
// `mapConversationContext` no-op'ing on undefined). Fix lands together
// with the post-mappers fix.
export function mapDbEventToPublic(row: EventWithMetadata, viewerProfileId: string): PublicEvent {
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
  row: EventWithMetadataAndContext,
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

export function mapDbEventToOwner(row: EventWithMetadata): OwnerEvent {
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
