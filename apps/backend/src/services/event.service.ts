import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  UserContentService,
  type ListOptions,
  userContentImagesInclude,
} from './userContent.service'
import type { CreateEventPayload, UpdateEventPayload } from '@zod/event/event.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { ImageService } from './image.service'

export class EventNotVisibleError extends Error {
  constructor() {
    super('Event not found or not visible')
    this.name = 'EventNotVisibleError'
  }
}

const eventWithMetadataInclude = {
  event: true,
  postedBy: { include: { profileImages: { include: { image: true } } } },
  ...userContentImagesInclude,
} as const

const eventWithMetadataAndContextInclude = (viewerProfileId: string) =>
  ({
    event: true,
    postedBy: {
      include: {
        profileImages: { include: { image: true } },
        ...conversationContextInclude(viewerProfileId),
      },
    },
    ...userContentImagesInclude,
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
    const { imageIds, ...contentData } = data
    return prisma.$transaction(
      async (tx) => {
        const created = await tx.userContent.create({
          data: {
            ...this.baseCreateData(contentData),
            kind: 'event',
            postedById: profileId,
            event: { create: { startsAt: data.startsAt, venue: data.venue ?? null } },
          },
          include: eventWithMetadataInclude,
        })
        await tx.eventAttendance.create({
          data: {
            eventContentId: created.id,
            profileId,
            status: 'GOING',
          },
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
    data: UpdateEventPayload
  ): Promise<EventWithMetadata | null> {
    const { startsAt, venue, ...baseFields } = data

    return prisma.$transaction(async (tx) => {
      const ok = await this.updateBaseScalars(tx, id, profileId, 'event', baseFields)
      if (!ok) return null

      await tx.eventContent.update({
        where: { userContentId: id },
        data: { startsAt, venue },
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
    viewerProfileId: string,
    opts: ListOptions
  ): Promise<EventWithMetadataAndContext[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        kind: 'event',
        isDeleted: false,
        isVisible: opts.includeInvisible ? undefined : true,
      },
      include: eventWithMetadataAndContextInclude(viewerProfileId),
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.offset,
    })
  }

  private async assertEventVisibleTo(
    eventContentId: string,
    viewerProfileId: string
  ): Promise<void> {
    const event = await prisma.userContent.findFirst({
      where: {
        id: eventContentId,
        kind: 'event',
        isDeleted: false,
        OR: [{ postedById: viewerProfileId }, { isVisible: true }],
      },
      select: { id: true },
    })
    if (!event) {
      throw new EventNotVisibleError()
    }
  }

  async rsvp(profileId: string, eventContentId: string, status: 'GOING' | 'MAYBE') {
    await this.assertEventVisibleTo(eventContentId, profileId)
    return prisma.eventAttendance.upsert({
      where: { eventContentId_profileId: { eventContentId, profileId } },
      create: { eventContentId, profileId, status },
      update: { status },
    })
  }

  async cancelRsvp(profileId: string, eventContentId: string): Promise<void> {
    await prisma.eventAttendance.deleteMany({
      where: { eventContentId, profileId },
    })
  }

  async listAttendees(viewerProfileId: string, eventContentId: string, status?: 'GOING' | 'MAYBE') {
    await this.assertEventVisibleTo(eventContentId, viewerProfileId)
    return prisma.eventAttendance.findMany({
      where: { eventContentId, ...(status ? { status } : {}) },
      include: { profile: { include: { profileImages: { include: { image: true } } } } },
      orderBy: { rsvpedAt: 'asc' },
    })
  }

  async getMyRsvp(profileId: string, eventContentId: string) {
    await this.assertEventVisibleTo(eventContentId, profileId)
    return prisma.eventAttendance.findUnique({
      where: { eventContentId_profileId: { eventContentId, profileId } },
    })
  }
}
