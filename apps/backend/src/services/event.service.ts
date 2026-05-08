import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserContentService, type ListOptions } from './userContent.service'
import type { CreateEventPayload, UpdateEventPayload } from '@zod/event/event.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'

const eventWithMetadataInclude = {
  event: true,
  postedBy: { include: { profileImages: true } },
} as const

const eventWithMetadataAndContextInclude = (viewerProfileId: string) =>
  ({
    event: true,
    postedBy: {
      include: {
        profileImages: true,
        ...conversationContextInclude(viewerProfileId),
      },
    },
  }) as const

export type EventWithMetadata = Prisma.UserContentGetPayload<{
  include: typeof eventWithMetadataInclude
}>

export type EventWithMetadataAndContext = Prisma.UserContentGetPayload<{
  include: ReturnType<typeof eventWithMetadataAndContextInclude>
}>

export class EventService extends UserContentService {
  private static eventInstance: EventService

  static getInstance(): EventService {
    if (!EventService.eventInstance) {
      EventService.eventInstance = new EventService()
    }
    return EventService.eventInstance
  }

  async create(profileId: string, data: CreateEventPayload): Promise<EventWithMetadata> {
    return prisma.userContent.create({
      data: {
        ...this.baseCreateData(data),
        kind: 'event',
        postedById: profileId,
        event: { create: { startsAt: data.startsAt } },
      },
      include: eventWithMetadataInclude,
    })
  }

  async update(
    id: string,
    profileId: string,
    data: UpdateEventPayload
  ): Promise<EventWithMetadata | null> {
    const { startsAt, ...baseFields } = data

    return prisma.$transaction(async (tx) => {
      const ok = await this.updateBaseScalars(tx, id, profileId, 'event', baseFields)
      if (!ok) return null

      await tx.eventContent.update({
        where: { userContentId: id },
        data: { startsAt },
      })

      return tx.userContent.findFirst({
        where: { id },
        include: eventWithMetadataInclude,
      })
    })
  }

  async findByIdHydrated(
    id: string,
    viewerProfileId: string
  ): Promise<EventWithMetadataAndContext | null> {
    return prisma.userContent.findFirst({
      where: {
        id,
        kind: 'event',
        isDeleted: false,
        OR: [{ postedById: viewerProfileId }, { isVisible: true }],
      },
      include: eventWithMetadataAndContextInclude(viewerProfileId),
    })
  }

  async findByProfileIdHydrated(
    profileId: string,
    opts: ListOptions
  ): Promise<EventWithMetadata[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        kind: 'event',
        isDeleted: false,
        isVisible: opts.includeInvisible ? undefined : true,
      },
      include: eventWithMetadataInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.offset,
    })
  }
}
