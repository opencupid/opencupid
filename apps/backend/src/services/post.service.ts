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
        ...this.baseCreateData(data),
        kind: 'post',
        postedById: profileId,
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
    const { type, ...baseFields } = data

    return prisma.$transaction(async (tx) => {
      const ok = await this.updateBaseScalars(tx, id, profileId, 'post', baseFields)
      if (!ok) return null

      await tx.postExtension.update({
        where: { userContentId: id },
        data: { type },
      })

      return tx.userContent.findFirst({
        where: { id },
        include: postWithExtensionInclude,
      })
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
