import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import type { ContentKind } from '@shared/zod/userContent/userContent.dto'

/**
 * Hard cap for cluster-index hydration. Not pagination — bounds the in-memory
 * Supercluster index size, which is rebuilt per (profile, tags, kinds) cache key.
 */
const CLUSTER_INDEX_LIMIT = 500

/**
 * Mirrors the post-parse shape of UserContentQuerySchema. `limit` and `offset`
 * are required because Zod's `.default()` guarantees them on the parsed value;
 * filters remain optional.
 */
export interface ListOptions {
  limit: number
  offset: number
  kind?: ContentKind
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

  async findFeed(opts: ListOptions): Promise<LeanContentRow[]> {
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        kind: opts.kind,
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.offset,
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
    opts: ListOptions
  ): Promise<LeanContentRow[]> {
    // Approximate bounding-box prefilter (1 deg lat ≈ 111 km).
    const dLat = radiusKm / 111
    const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        kind: opts.kind,
        lat: { gte: lat - dLat, lte: lat + dLat },
        lon: { gte: lon - dLon, lte: lon + dLon },
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.offset,
    })
  }

  async findByProfileId(profileId: string, opts: ListOptions): Promise<LeanContentRow[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        isDeleted: false,
        isVisible: opts.includeInvisible ? undefined : true,
        kind: opts.kind,
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.offset,
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
    kinds: ContentKind[]
  ): Promise<LeanContentRow[]> {
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        lat: { not: null },
        lon: { not: null },
        postedBy: blocklistWhereClause(viewerProfileId),
        kind: { in: kinds },
      },
      include: profileSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: CLUSTER_INDEX_LIMIT,
    })
  }
}
