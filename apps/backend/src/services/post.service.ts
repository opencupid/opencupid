import { PrismaClient, PostType, Prisma } from '@prisma/client'
import type { CreatePostPayload, UpdatePostPayload } from '@zod/post/post.dto'

export class PostService {
  private static instance: PostService
  private prisma: PrismaClient

  private constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  public static getInstance(prisma?: PrismaClient): PostService {
    if (!PostService.instance) {
      if (!prisma) {
        throw new Error('PostService requires PrismaClient on first instantiation')
      }
      PostService.instance = new PostService(prisma)
    }
    return PostService.instance
  }

  async create(profileId: string, data: CreatePostPayload) {
    return this.prisma.post.create({
      data: {
        content: data.content,
        type: data.type,
        postedById: profileId,
      },
      include: {
        postedBy: {
          select: {
            id: true,
            publicName: true,
            profileImages: {
              where: { position: 0 },
              select: {
                id: true,
                url: true,
                altText: true,
              },
            },
          },
        },
      },
    })
  }

  async findById(id: string, viewerProfileId?: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        id,
        isDeleted: false,
        ...(viewerProfileId ? {} : { isVisible: true }),
      },
      include: {
        postedBy: {
          select: {
            id: true,
            publicName: true,
            profileImages: {
              where: { position: 0 },
              select: {
                id: true,
                url: true,
                altText: true,
              },
            },
          },
        },
      },
    })

    // If viewer is not the owner, only return visible posts
    if (viewerProfileId !== post?.postedById && !post?.isVisible) {
      return null
    }

    return post
  }

  async findByProfileId(profileId: string, options: {
    type?: PostType
    limit?: number
    offset?: number
    includeInvisible?: boolean
  } = {}) {
    const { type, limit = 20, offset = 0, includeInvisible = false } = options

    return this.prisma.post.findMany({
      where: {
        postedById: profileId,
        isDeleted: false,
        ...(includeInvisible ? {} : { isVisible: true }),
        ...(type ? { type } : {}),
      },
      include: {
        postedBy: {
          select: {
            id: true,
            publicName: true,
            profileImages: {
              where: { position: 0 },
              select: {
                id: true,
                url: true,
                altText: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findAll(options: {
    type?: PostType
    limit?: number
    offset?: number
  } = {}) {
    const { type, limit = 20, offset = 0 } = options

    return this.prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(type ? { type } : {}),
      },
      include: {
        postedBy: {
          select: {
            id: true,
            publicName: true,
            profileImages: {
              where: { position: 0 },
              select: {
                id: true,
                url: true,
                altText: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findNearby(lat: number, lon: number, radius: number, options: {
    type?: PostType
    limit?: number
    offset?: number
  } = {}) {
    const { type, limit = 20, offset = 0 } = options

    // Calculate bounding box for efficiency (approximate)
    const latRange = radius / 111.0 // 1 degree lat ≈ 111 km
    const lonRange = radius / (111.0 * Math.cos(lat * Math.PI / 180))

    const minLat = lat - latRange
    const maxLat = lat + latRange
    const minLon = lon - lonRange
    const maxLon = lon + lonRange

    return this.prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        ...(type ? { type } : {}),
        postedBy: {
          lat: { gte: minLat, lte: maxLat },
          lon: { gte: minLon, lte: maxLon },
        },
      },
      include: {
        postedBy: {
          select: {
            id: true,
            publicName: true,
            lat: true,
            lon: true,
            profileImages: {
              where: { position: 0 },
              select: {
                id: true,
                url: true,
                altText: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async findRecent(options: {
    type?: PostType
    limit?: number
    offset?: number
  } = {}) {
    const { type, limit = 20, offset = 0 } = options
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return this.prisma.post.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        createdAt: { gte: oneWeekAgo },
        ...(type ? { type } : {}),
      },
      include: {
        postedBy: {
          select: {
            id: true,
            publicName: true,
            profileImages: {
              where: { position: 0 },
              select: {
                id: true,
                url: true,
                altText: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  }

  async update(id: string, profileId: string, data: UpdatePostPayload) {
    // Only allow owner to update
    const post = await this.prisma.post.findFirst({
      where: { id, postedById: profileId, isDeleted: false },
    })

    if (!post) {
      return null
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
        updatedAt: new Date(),
      },
      include: {
        postedBy: {
          select: {
            id: true,
            publicName: true,
            profileImages: {
              where: { position: 0 },
              select: {
                id: true,
                url: true,
                altText: true,
              },
            },
          },
        },
      },
    })
  }

  async delete(id: string, profileId: string) {
    // Only allow owner to delete
    const post = await this.prisma.post.findFirst({
      where: { id, postedById: profileId, isDeleted: false },
    })

    if (!post) {
      return null
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    })
  }
}