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
import { mapTagsTranslated } from './tag.mappers'
import type { MapperContext } from './context'

export function mapDbCommunityToPublic(
  row: CommunityWithMetadata,
  ctx: MapperContext
): PublicCommunity {
  return {
    id: row.id,
    kind: 'community',
    yearFounded: row.community!.yearFounded,
    contactUrl: row.community!.contactUrl,
    contactEmail: row.community!.contactEmail,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === ctx.viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
    images: row.images.map((j) => toPublicImage(j.image)),
    tags: mapTagsTranslated(row.tags, ctx.locale),
  }
}

export function mapDbCommunityToDetail(
  row: CommunityWithMetadataAndContext,
  ctx: MapperContext
): PublicCommunityDetail {
  return {
    id: row.id,
    kind: 'community',
    yearFounded: row.community!.yearFounded,
    contactUrl: row.community!.contactUrl,
    contactEmail: row.community!.contactEmail,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: false,
    postedBy: {
      ...mapProfileSummary(row.postedBy),
      ...mapConversationContext(row.postedBy, ctx.viewerProfileId),
    },
    location: extractLocation(row) ?? undefined,
    images: row.images.map((j) => toPublicImage(j.image)),
    tags: mapTagsTranslated(row.tags, ctx.locale),
  }
}

export function mapDbCommunityToOwner(
  row: CommunityWithMetadata,
  ctx: MapperContext
): OwnerCommunity {
  return OwnerCommunitySchema.parse({
    id: row.id,
    kind: 'community',
    yearFounded: row.community!.yearFounded,
    contactUrl: row.community!.contactUrl,
    contactEmail: row.community!.contactEmail,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: row.isDeleted,
    isVisible: row.isVisible,
    isOwn: true,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
    images: row.images.map((j) => toOwnerImage(j.image)),
    tags: mapTagsTranslated(row.tags, ctx.locale),
  })
}
