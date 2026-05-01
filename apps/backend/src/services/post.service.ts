import { PostType, Prisma } from '@prisma/client'
import type { CreatePostPayload, UpdatePostPayload } from '@zod/post/post.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'
import { prisma } from '@/lib/prisma'
import type { UserContentService, ListOptions, BoundsBox } from './userContent.service'
import {
  boundingBoxWhere,
  boundsWhere,
  notDeleted,
  ownedBy,
  paginate,
  recentSince,
  softDeleteData,
  visibilityFilter,
  visible,
} from './userContent.helpers'

const typeFilter = (type?: string) => (type ? { type: type as PostType } : {})

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

export class PostService implements UserContentService<
  PostWithProfile,
  PostWithProfileAndContext,
  PostWithProfile,
  CreatePostPayload,
  UpdatePostPayload
> {
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
      where: { id, ...notDeleted },
      ...postedByInclude,
    })
  }

  async findByIdWithContext(
    id: string,
    viewerProfileId: string
  ): Promise<PostWithProfileAndContext | null> {
    const post = await prisma.post.findFirst({
      where: { id, ...notDeleted },
      ...postedByWithConversationInclude(viewerProfileId),
    })

    // Non-owners can only see visible posts.
    if (post && post.postedById !== viewerProfileId && !post.isVisible) {
      return null
    }

    return post
  }

  async findByProfileId(
    profileId: string,
    options: ListOptions & { includeInvisible?: boolean } = {}
  ): Promise<PostWithProfile[]> {
    return prisma.post.findMany({
      where: {
        postedById: profileId,
        ...notDeleted,
        ...visibilityFilter(options.includeInvisible ?? false),
        ...typeFilter(options.type),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      ...paginate(options),
    })
  }

  async findAll(options: ListOptions = {}): Promise<PostWithProfile[]> {
    return prisma.post.findMany({
      where: { ...visible, ...typeFilter(options.type) },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      ...paginate(options),
    })
  }

  async findNearby(
    lat: number,
    lon: number,
    radius: number,
    options: ListOptions = {}
  ): Promise<PostWithProfile[]> {
    return prisma.post.findMany({
      where: {
        ...visible,
        ...typeFilter(options.type),
        ...boundingBoxWhere(lat, lon, radius),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      ...paginate(options),
    })
  }

  async findInBounds(bounds: BoundsBox): Promise<PostWithProfile[]> {
    return prisma.post.findMany({
      where: { ...visible, ...boundsWhere(bounds) },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async findAllWithLocation(viewerProfileId: string, limit = 500): Promise<PostWithProfile[]> {
    return prisma.post.findMany({
      where: {
        ...visible,
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
    return prisma.post.findMany({
      where: {
        ...visible,
        createdAt: { gte: recentSince(7) },
        ...typeFilter(options.type),
      },
      ...postedByInclude,
      orderBy: { createdAt: 'desc' },
      ...paginate(options),
    })
  }

  async update(
    id: string,
    profileId: string,
    data: UpdatePostPayload
  ): Promise<PostWithProfile | null> {
    const owned = await prisma.post.findFirst({ where: ownedBy(id, profileId) })
    if (!owned) return null

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
    const owned = await prisma.post.findFirst({ where: ownedBy(id, profileId) })
    if (!owned) return null

    return prisma.post.update({ where: { id }, data: softDeleteData() })
  }
}
