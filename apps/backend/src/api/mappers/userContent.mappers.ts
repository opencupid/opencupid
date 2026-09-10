import type { OwnerHydratedRow, UserContentMetadataRow } from '@/services/userContent.service'
import { mapProfileSummary } from './profile.mappers'
import { extractLocation } from './location.mappers'
import { toPublicImage } from './image.mappers'
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'
import type { OwnerUserContent } from '@zod/userContent/publicContent.dto'
import { mapDbPostToOwner } from './post.mappers'
import { mapDbEventToOwner } from './event.mappers'
import { mapDbCommunityToOwner } from './community.mappers'
import { mapTagsTranslated } from './tag.mappers'
import type { MapperContext } from './context'

export function mapUserContentMetadata(
  row: UserContentMetadataRow,
  ctx: MapperContext
): UserContentMetadata {
  return {
    id: row.id,
    kind: row.kind,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === ctx.viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
    images: row.images.map((j) => toPublicImage(j.image)),
    tags: mapTagsTranslated(row.tags, ctx.locale),
  }
}

/**
 * Maps an owner-hydrated row (UserContent + all kind-specific content rows
 * + profile summary loaded eagerly) to the discriminated OwnerUserContent
 * union. Dispatches by `row.kind` and delegates to the per-kind owner mapper.
 */
export function mapOwnerUserContent(row: OwnerHydratedRow, ctx: MapperContext): OwnerUserContent {
  switch (row.kind) {
    case 'post':
      return mapDbPostToOwner(row, ctx)
    case 'event':
      return mapDbEventToOwner(row, ctx)
    case 'community':
      return mapDbCommunityToOwner(row, ctx)
  }
}
