import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserContentService } from './userContent.service'
import type { CreateEventPayload, UpdateEventPayload } from '@zod/event/event.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'

const eventWithExtensionInclude = {
  event: true,
  postedBy: { include: { profileImages: true } },
} as const

const eventWithExtensionAndContextInclude = (viewerProfileId: string) =>
  ({
    event: true,
    postedBy: {
      include: {
        profileImages: true,
        ...conversationContextInclude(viewerProfileId),
      },
    },
  }) as const

export type EventWithExtension = Prisma.UserContentGetPayload<{
  include: typeof eventWithExtensionInclude
}>

export type EventWithExtensionAndContext = Prisma.UserContentGetPayload<{
  include: ReturnType<typeof eventWithExtensionAndContextInclude>
}>

export class EventService extends UserContentService {
  private static eventInstance: EventService

  static getInstance(): EventService {
    if (!EventService.eventInstance) {
      EventService.eventInstance = new EventService()
    }
    return EventService.eventInstance
  }

  async create(profileId: string, data: CreateEventPayload): Promise<EventWithExtension> {
    return prisma.userContent.create({
      data: {
        kind: 'event',
        postedById: profileId,
        content: data.content,
        country: data.country ?? null,
        cityName: data.cityName ?? null,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
        event: { create: { startsAt: data.startsAt } },
      },
      include: eventWithExtensionInclude,
    })
  }

  async update(
    id: string,
    profileId: string,
    data: UpdateEventPayload
  ): Promise<EventWithExtension | null> {
    const { startsAt, ...baseFields } = data

    return prisma.$transaction(async (tx) => {
      const ok = await this.updateBaseScalars(tx, id, profileId, 'event', baseFields)
      if (!ok) return null

      if (startsAt !== undefined) {
        await tx.eventExtension.update({
          where: { userContentId: id },
          data: { startsAt },
        })
      }

      return tx.userContent.findFirst({
        where: { id },
        include: eventWithExtensionInclude,
      })
    })
  }

  async findByIdHydrated(
    id: string,
    viewerProfileId: string
  ): Promise<EventWithExtensionAndContext | null> {
    return prisma.userContent.findFirst({
      where: { id, kind: 'event', isDeleted: false },
      include: eventWithExtensionAndContextInclude(viewerProfileId),
    })
  }

  async findByProfileIdHydrated(
    profileId: string,
    opts: { limit?: number; offset?: number; includeInvisible?: boolean }
  ): Promise<EventWithExtension[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        kind: 'event',
        isDeleted: false,
        ...(opts.includeInvisible ? {} : { isVisible: true }),
      },
      include: eventWithExtensionInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    })
  }
}
