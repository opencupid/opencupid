import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import type { BaseUserContentPayload, ContentKind } from '@shared/zod/userContent/userContent.dto'

/**
 * Hard cap for cluster-index hydration. Not pagination — bounds the in-memory
 * Supercluster index size, which is rebuilt per (profile, tags, kinds) cache key.
 */
const CLUSTER_INDEX_LIMIT = 500

/**
 * Required shape for paginated list reads. Every field that drives behavior
 * is non-optional: `limit`/`offset` come from Zod-defaulted parsed query;
 * `includeInvisible` forces every call site to declare its visibility intent
 * (public read = false, owner read = true). `kind` stays optional because
 * it's a filter, not a behavior switch.
 */
export interface ListOptions {
  limit: number
  offset: number
  includeInvisible: boolean
  kind?: ContentKind
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
      where: {
        id,
        isDeleted: false,
        OR: [{ postedById: viewerProfileId }, { isVisible: true }],
      },
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

  /**
   * Coerces the shared write-side fields from a Zod-parsed payload into the
   * Prisma `UserContentCreateInput` scalar slice. `.nullable().optional()`
   * Zod fields produce `string | null | undefined`; Prisma's CreateInput
   * (under exactOptionalPropertyTypes) demands `string | null`, so each
   * nullable field is `?? null`-coerced once here. Subclasses spread the
   * result and add their own augmentation (kind, postedById, extension).
   */
  protected baseCreateData(data: BaseUserContentPayload) {
    return {
      content: data.content,
      country: data.country ?? null,
      cityName: data.cityName ?? null,
      lat: data.lat ?? null,
      lon: data.lon ?? null,
    }
  }

  /**
   * Atomically gates a UserContent scalar update on ownership and kind.
   * Used by per-kind services (PostService, EventService) inside a tx that
   * also writes to the kind-specific extension table. Always bumps
   * updatedAt so extension-only edits still register on the base row.
   * Returns true if the row was matched and updated, false otherwise.
   */
  protected async updateBaseScalars(
    tx: Prisma.TransactionClient,
    id: string,
    profileId: string,
    kind: ContentKind,
    scalars: Omit<Prisma.UserContentUpdateInput, 'updatedAt'>
  ): Promise<boolean> {
    const result = await tx.userContent.updateMany({
      where: { id, postedById: profileId, kind, isDeleted: false },
      data: { ...scalars, updatedAt: new Date() },
    })
    return result.count === 1
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
