import { PostType, Prisma } from '@prisma/client'
import type { CreatePostPayload, UpdatePostPayload } from '@zod/post/post.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { prisma } from '@/lib/prisma'

const postedByInclude = {
  include: {
    postedBy: {
      include: {
        profileImages: true,
      },
    },
  },
} satisfies Prisma.PostFindFirstArgs

const postedByWithConversationInclude = (viewerProfileId: string) =>
  ({
    include: {
      postedBy: {
        include: {
          profileImages: true,
          ...conversationContextInclude(viewerProfileId),
        },
      },
    },
  }) satisfies Prisma.PostFindFirstArgs

export type PostWithProfileAndContext = Prisma.PostGetPayload<
  ReturnType<typeof postedByWithConversationInclude>
>

export class PostService {
  private static instance: PostService

  static getInstance(): PostService {
    if (!PostService.instance) {
      PostService.instance = new PostService()
    }
    return PostService.instance
  }

  async create(profileId: string, data: CreatePostPayload) {
    return prisma.post.create({
      data: {
        content: data.content,
        type: data.type,
        postedById: profileId,
        country: data.country ?? null,
        cityName: data.cityName ?? null,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
      },
      ...postedByInclude,
    })
  }

  async findById(id: string) {
    return prisma.post.findFirst({
      where: { id, isDeleted: false },
      ...postedByInclude,
    })
  }

  async findByIdWithContext(
    id: string,
    viewerProfileId: string
  ): Promise<PostWithProfileAndContext | null> {
    const post = await prisma.post.findFirst({
      where: { id, isDeleted: false },
      ...postedByWithConversationInclude(viewerProfileId),
    })

    // Non-owners can only see visible posts
    if (post && post.postedById !== viewerProfileId && !post.isVisible) {
      return null
    }

    return post
  }

  async findByProfileId(
    profileId: string,
    options: {
      type?: PostType
      limit?: number
      offset?: number
      includeInvisible?: boolean
    } = {}
  ) {
    const { type, limit = 20, offset = 0, includeInvisible = false } = options

    return prisma.post.findMany({
      where: {
        postedById: profileId,
        isDeleted: false,
        ...(includeInvisible ? {} : { isVisible: true }),
        ...(type ? { type } : {}),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findAll(
    options: {
      type?: PostType
      limit?: number
      offset?: number
    } = {}
  ) {
    const { type, limit = 20, offset = 0 } = options

    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(type ? { type } : {}),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findNearby(
    lat: number,
    lon: number,
    radius: number,
    options: {
      type?: PostType
      limit?: number
      offset?: number
    } = {}
  ) {
    const { type, limit = 20, offset = 0 } = options

    // Calculate bounding box for efficiency (approximate)
    const latRange = radius / 111.0 // 1 degree lat ≈ 111 km
    const lonRange = radius / (111.0 * Math.cos((lat * Math.PI) / 180))

    const minLat = lat - latRange
    const maxLat = lat + latRange
    const minLon = lon - lonRange
    const maxLon = lon + lonRange

    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(type ? { type } : {}),
        lat: { gte: minLat, lte: maxLat },
        lon: { gte: minLon, lte: maxLon },
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findInBounds(
    bounds: { south: number; north: number; west: number; east: number },
    options: {
      type?: PostType
      limit?: number
      offset?: number
    } = {}
  ) {
    const { type, limit = 100, offset = 0 } = options

    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(type ? { type } : {}),
        lat: { gte: bounds.south, lte: bounds.north },
        lon: { gte: bounds.west, lte: bounds.east },
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findAllWithLocation(viewerProfileId: string, limit = 500) {
    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        lat: { not: null },
        lon: { not: null },
        postedBy: blocklistWhereClause(viewerProfileId),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async findRecent(
    options: {
      type?: PostType
      limit?: number
      offset?: number
    } = {}
  ) {
    const { type, limit = 20, offset = 0 } = options
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        createdAt: { gte: oneWeekAgo },
        ...(type ? { type } : {}),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async update(id: string, profileId: string, data: UpdatePostPayload) {
    // Only allow owner to update
    const post = await prisma.post.findFirst({
      where: { id, postedById: profileId, isDeleted: false },
    })

    if (!post) {
      return null
    }

    return prisma.post.update({
      where: { id },
      data: {
        content: data.content,
        type: data.type,
        isVisible: data.isVisible,
        country: data.country,
        cityName: data.cityName,
        lat: data.lat,
        lon: data.lon,
        updatedAt: new Date(),
      },
      ...postedByInclude,
    })
  }

  async delete(id: string, profileId: string) {
    // Only allow owner to delete
    const post = await prisma.post.findFirst({
      where: { id, postedById: profileId, isDeleted: false },
    })

    if (!post) {
      return null
    }

    return prisma.post.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })
  }
}
