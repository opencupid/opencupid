import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserContentService, type ListOptions } from './userContent.service'
import type { CreateCommunityPayload, UpdateCommunityPayload } from '@zod/community/community.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { ImageService } from './image.service'

const communityWithMetadataInclude = {
  community: true,
  postedBy: { include: { profileImages: { include: { image: true } } } },
} as const

const communityWithMetadataAndContextInclude = (viewerProfileId: string) =>
  ({
    community: true,
    postedBy: {
      include: {
        profileImages: { include: { image: true } },
        ...conversationContextInclude(viewerProfileId),
      },
    },
  }) as const

export type CommunityWithMetadata = Prisma.UserContentGetPayload<{
  include: typeof communityWithMetadataInclude
}>

export type CommunityWithMetadataAndContext = Prisma.UserContentGetPayload<{
  include: ReturnType<typeof communityWithMetadataAndContextInclude>
}>

export class CommunityService extends UserContentService {
  private static communityInstance: CommunityService

  static getInstance(): CommunityService {
    if (!CommunityService.communityInstance) {
      CommunityService.communityInstance = new CommunityService()
    }
    return CommunityService.communityInstance
  }

  async create(profileId: string, data: CreateCommunityPayload): Promise<CommunityWithMetadata> {
    const { imageIds, ...contentData } = data
    return prisma.$transaction(
      async (tx) => {
        const created = await tx.userContent.create({
          data: {
            ...this.baseCreateData(contentData),
            kind: 'community',
            postedById: profileId,
            community: { create: { yearFounded: data.yearFounded ?? null } },
          },
          include: communityWithMetadataInclude,
        })
        if (imageIds && imageIds.length > 0) {
          await ImageService.getInstance().attachManyToUserContentTx(
            tx,
            imageIds,
            created.id,
            profileId
          )
        }
        return created
      },
      { isolationLevel: 'Serializable' }
    )
  }

  async update(
    id: string,
    profileId: string,
    data: UpdateCommunityPayload
  ): Promise<CommunityWithMetadata | null> {
    const { yearFounded, ...baseFields } = data

    return prisma.$transaction(async (tx) => {
      const ok = await this.updateBaseScalars(tx, id, profileId, 'community', baseFields)
      if (!ok) return null

      if (yearFounded !== undefined) {
        await tx.communityContent.update({
          where: { userContentId: id },
          data: { yearFounded },
        })
      }

      return tx.userContent.findFirst({
        where: { id },
        include: communityWithMetadataInclude,
      })
    })
  }

  async findByIdHydrated(
    id: string,
    viewerProfileId: string
  ): Promise<CommunityWithMetadataAndContext | null> {
    return prisma.userContent.findFirst({
      where: {
        id,
        kind: 'community',
        isDeleted: false,
        OR: [{ postedById: viewerProfileId }, { isVisible: true }],
      },
      include: communityWithMetadataAndContextInclude(viewerProfileId),
    })
  }

  async findByProfileIdHydrated(
    profileId: string,
    viewerProfileId: string,
    opts: ListOptions
  ): Promise<CommunityWithMetadataAndContext[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        kind: 'community',
        isDeleted: false,
        isVisible: opts.includeInvisible ? undefined : true,
      },
      include: communityWithMetadataAndContextInclude(viewerProfileId),
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.offset,
    })
  }
}
