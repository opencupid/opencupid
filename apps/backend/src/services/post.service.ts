import { PostType, Prisma } from '@prisma/client'
import type { CreatePostPayload, UpdatePostPayload } from '@zod/post/post.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { prisma } from '@/lib/prisma'
import type {
  UserContentService,
  ListOptions,
  BoundsBox,
} from './userContent.service'

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

export type PostWithProfile = Prisma.PostGetPayload<typeof postedByInclude>

export type PostWithProfileAndContext = Prisma.PostGetPayload<
  ReturnType<typeof postedByWithConversationInclude>
>

export class PostService
  implements
    UserContentService<
      PostWithProfile,
      PostWithProfileAndContext,
      PostWithProfile,
      CreatePostPayload,
      UpdatePostPayload
    >
{
  private static instance: PostService

  private constructor() {}

  static getInstance(): PostService {
    if (!PostService.instance) {
      PostService.instance = new PostService()
    }
    return PostService.instance
  }

  async create(profileId: string, data: CreatePostPayload): Promise<PostWithProfile> {
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

  async findById(id: string): Promise<PostWithProfile | null> {
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
    options: ListOptions & { includeInvisible?: boolean } = {}
  ): Promise<PostWithProfile[]> {
    const { type, limit = 20, offset = 0, includeInvisible = false } = options

    return prisma.post.findMany({
      where: {
        postedById: profileId,
        isDeleted: false,
        ...(includeInvisible ? {} : { isVisible: true }),
        ...(type ? { type: type as PostType } : {}),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findAll(options: ListOptions = {}): Promise<PostWithProfile[]> {
    const { type, limit = 20, offset = 0 } = options

    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(type ? { type: type as PostType } : {}),
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
    options: ListOptions = {}
  ): Promise<PostWithProfile[]> {
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
        ...(type ? { type: type as PostType } : {}),
        lat: { gte: minLat, lte: maxLat },
        lon: { gte: minLon, lte: maxLon },
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findInBounds(bounds: BoundsBox): Promise<PostWithProfile[]> {
    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        lat: { gte: bounds.south, lte: bounds.north },
        lon: { gte: bounds.west, lte: bounds.east },
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async findAllWithLocation(viewerProfileId: string, limit = 500): Promise<PostWithProfile[]> {
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

  async findRecent(options: ListOptions = {}): Promise<PostWithProfile[]> {
    const { type, limit = 20, offset = 0 } = options
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        createdAt: { gte: oneWeekAgo },
        ...(type ? { type: type as PostType } : {}),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async update(
    id: string,
    profileId: string,
    data: UpdatePostPayload
  ): Promise<PostWithProfile | null> {
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

  async delete(id: string, profileId: string): Promise<{ id: string } | null> {
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
