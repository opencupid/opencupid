import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'

export interface ListOptions {
  limit?: number
  offset?: number
  kind?: 'post' | 'event'
  includeInvisible?: boolean
}

export interface BoundsBox {
  south: number
  north: number
  west: number
  east: number
}

const profileSummaryInclude = {
  postedBy: { include: { profileImages: true } },
} as const

const profileWithContextInclude = (viewerProfileId: string) =>
  ({
    postedBy: {
      include: {
        profileImages: true,
        ...conversationContextInclude(viewerProfileId),
      },
    },
  }) as const

export type LeanContentRow = Prisma.UserContentGetPayload<{
  include: typeof profileSummaryInclude
}>

export type LeanContentRowWithContext = Prisma.UserContentGetPayload<{
  include: ReturnType<typeof profileWithContextInclude>
}>

export class UserContentService {
  private static instance: UserContentService

  protected constructor() {}

  static getInstance(): UserContentService {
    if (!UserContentService.instance) {
      UserContentService.instance = new UserContentService()
    }
    return UserContentService.instance
  }

  async findFeed(opts: ListOptions = {}): Promise<LeanContentRow[]> {
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(opts.kind ? { kind: opts.kind } : {}),
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    })
  }

  async findInBounds(box: BoundsBox): Promise<LeanContentRow[]> {
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        lat: { gte: box.south, lte: box.north },
        lon: { gte: box.west, lte: box.east },
      },
      include: profileSummaryInclude,
    })
  }

  async findNearby(
    lat: number,
    lon: number,
    radiusKm: number,
    opts: ListOptions = {}
  ): Promise<LeanContentRow[]> {
    // Approximate bounding-box prefilter (1 deg lat ≈ 111 km).
    const dLat = radiusKm / 111
    const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(opts.kind ? { kind: opts.kind } : {}),
        lat: { gte: lat - dLat, lte: lat + dLat },
        lon: { gte: lon - dLon, lte: lon + dLon },
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    })
  }

  async findByProfileId(profileId: string, opts: ListOptions = {}): Promise<LeanContentRow[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        isDeleted: false,
        ...(opts.includeInvisible ? {} : { isVisible: true }),
        ...(opts.kind ? { kind: opts.kind } : {}),
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    })
  }

  async findByIdLean(
    id: string,
    viewerProfileId: string
  ): Promise<LeanContentRowWithContext | null> {
    return prisma.userContent.findFirst({
      where: { id, isDeleted: false },
      include: profileWithContextInclude(viewerProfileId),
    })
  }

  async softDelete(id: string, profileId: string): Promise<{ id: string } | null> {
    const result = await prisma.userContent.updateMany({
      where: { id, postedById: profileId, isDeleted: false },
      data: { isDeleted: true },
    })
    return result.count === 1 ? { id } : null
  }

  async setVisibility(
    id: string,
    profileId: string,
    isVisible: boolean
  ): Promise<{ id: string } | null> {
    const result = await prisma.userContent.updateMany({
      where: { id, postedById: profileId, isDeleted: false },
      data: { isVisible },
    })
    return result.count === 1 ? { id } : null
  }

  async findAllWithLocation(
    viewerProfileId: string,
    opts: { kinds?: ('post' | 'event')[]; limit?: number } = {}
  ): Promise<LeanContentRow[]> {
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        lat: { not: null },
        lon: { not: null },
        postedBy: blocklistWhereClause(viewerProfileId),
        ...(opts.kinds && opts.kinds.length > 0 ? { kind: { in: opts.kinds } } : {}),
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 500,
    })
  }
}
