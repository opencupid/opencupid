import {
  OwnerCommunitySchema,
  type PublicCommunity,
  type PublicCommunityDetail,
  type OwnerCommunity,
} from '@zod/community/community.dto'
import type {
  CommunityWithMetadata,
  CommunityWithMetadataAndContext,
} from '@/services/community.service'
import { mapProfileSummary } from './profile.mappers'
import { mapConversationContext } from './interaction.mappers'
import { extractLocation } from './location.mappers'
import { toOwnerImage, toPublicImage } from './image.mappers'

export function mapDbCommunityToPublic(
  row: CommunityWithMetadata,
  viewerProfileId: string
): PublicCommunity {
  return {
    id: row.id,
    kind: 'community',
    yearFounded: row.community!.yearFounded,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
    images: row.images.map((j) => toPublicImage(j.image)),
  }
}

export function mapDbCommunityToDetail(
  row: CommunityWithMetadataAndContext,
  viewerProfileId: string
): PublicCommunityDetail {
  return {
    id: row.id,
    kind: 'community',
    yearFounded: row.community!.yearFounded,
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

export function mapDbCommunityToOwner(row: CommunityWithMetadata): OwnerCommunity {
  return OwnerCommunitySchema.parse({
    id: row.id,
    kind: 'community',
    yearFounded: row.community!.yearFounded,
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
