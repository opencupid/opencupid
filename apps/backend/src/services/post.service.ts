import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserContentService } from './userContent.service'
import type { CreatePostPayload, UpdatePostPayload } from '@zod/post/post.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'

const postWithExtensionInclude = {
  post: true,
  postedBy: { include: { profileImages: true } },
} as const

const postWithExtensionAndContextInclude = (viewerProfileId: string) =>
  ({
    post: true,
    postedBy: {
      include: {
        profileImages: true,
        ...conversationContextInclude(viewerProfileId),
      },
    },
  }) as const

export type PostWithExtension = Prisma.UserContentGetPayload<{
  include: typeof postWithExtensionInclude
}>

export type PostWithExtensionAndContext = Prisma.UserContentGetPayload<{
  include: ReturnType<typeof postWithExtensionAndContextInclude>
}>

export class PostService extends UserContentService {
  private static postInstance: PostService

  static getInstance(): PostService {
    if (!PostService.postInstance) {
      PostService.postInstance = new PostService()
    }
    return PostService.postInstance
  }

  async create(profileId: string, data: CreatePostPayload): Promise<PostWithExtension> {
    return prisma.userContent.create({
      data: {
        kind: 'post',
        postedById: profileId,
        content: data.content,
        country: data.country ?? null,
        cityName: data.cityName ?? null,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
        post: { create: { type: data.type } },
      },
      include: postWithExtensionInclude,
    })
  }

  async update(
    id: string,
    profileId: string,
    data: UpdatePostPayload
  ): Promise<PostWithExtension | null> {
    const owns = await prisma.userContent.findFirst({
      where: { id, postedById: profileId, kind: 'post', isDeleted: false },
      select: { id: true },
    })
    if (!owns) return null

    const baseUpdate: Prisma.UserContentUpdateInput = {}
    if (data.content !== undefined) baseUpdate.content = data.content
    if (data.country !== undefined) baseUpdate.country = data.country
    if (data.cityName !== undefined) baseUpdate.cityName = data.cityName
    if (data.lat !== undefined) baseUpdate.lat = data.lat
    if (data.lon !== undefined) baseUpdate.lon = data.lon
    if (data.isVisible !== undefined) baseUpdate.isVisible = data.isVisible

    if (data.type !== undefined) {
      baseUpdate.post = { update: { type: data.type } }
    }

    return prisma.userContent.update({
      where: { id },
      data: baseUpdate,
      include: postWithExtensionInclude,
    })
  }

  async findByIdHydrated(
    id: string,
    viewerProfileId: string
  ): Promise<PostWithExtensionAndContext | null> {
    return prisma.userContent.findFirst({
      where: { id, kind: 'post', isDeleted: false },
      include: postWithExtensionAndContextInclude(viewerProfileId),
    })
  }

  async findByProfileIdHydrated(
    profileId: string,
    opts: { limit?: number; offset?: number; includeInvisible?: boolean }
  ): Promise<PostWithExtension[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        kind: 'post',
        isDeleted: false,
        ...(opts.includeInvisible ? {} : { isVisible: true }),
      },
      include: postWithExtensionInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
      skip: opts.offset ?? 0,
    })
  }
}
