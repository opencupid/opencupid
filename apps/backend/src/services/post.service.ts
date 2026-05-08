import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  UserContentService,
  type ListOptions,
  type BoundsBox,
  type LeanContentRow,
} from './userContent.service'
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
      where: {
        id,
        kind: 'post',
        isDeleted: false,
        OR: [{ postedById: viewerProfileId }, { isVisible: true }],
      },
      include: postWithExtensionAndContextInclude(viewerProfileId),
    })
  }

  async findByProfileIdHydrated(
    profileId: string,
    opts: ListOptions
  ): Promise<PostWithExtension[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        kind: 'post',
        isDeleted: false,
        isVisible: opts.includeInvisible ? undefined : true,
      },
      include: postWithExtensionInclude,
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.offset,
    })
  }

  // The list-style finders below delegate filtering/pagination to
  // UserContentService and reattach the post extension afterwards. EventService
  // will need the same shape; the duplication is intentional until both sides
  // exist, at which point the pattern can be lifted into the base class as a
  // generic `findHydrated(kind, query, extensionInclude)` helper.
  async findFeedHydrated(opts: ListOptions): Promise<PostWithExtension[]> {
    const lean = await this.findFeed({ ...opts, kind: 'post' })
    return this.attachPostExtension(lean)
  }

  async findNearbyHydrated(
    lat: number,
    lon: number,
    radiusKm: number,
    opts: ListOptions
  ): Promise<PostWithExtension[]> {
    const lean = await this.findNearby(lat, lon, radiusKm, { ...opts, kind: 'post' })
    return this.attachPostExtension(lean)
  }

  async findInBoundsHydrated(box: BoundsBox): Promise<PostWithExtension[]> {
    const lean = (await this.findInBounds(box)).filter((r) => r.kind === 'post')
    return this.attachPostExtension(lean)
  }

  private async attachPostExtension(rows: LeanContentRow[]): Promise<PostWithExtension[]> {
    if (rows.length === 0) return []
    const extensions = await prisma.postExtension.findMany({
      where: { userContentId: { in: rows.map((r) => r.id) } },
    })
    const byId = new Map(extensions.map((e) => [e.userContentId, e]))
    return rows.flatMap((r) => {
      const post = byId.get(r.id)
      return post ? [{ ...r, post }] : []
    })
  }
}
