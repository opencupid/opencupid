import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  UserContentService,
  type ListOptions,
  type UserContentMetadataRow,
} from './userContent.service'
import type { CreatePostPayload, UpdatePostPayload } from '@zod/post/post.dto'
import { conversationContextInclude } from '@/db/includes/profileIncludes'

const postWithMetadataInclude = {
  post: true,
  postedBy: { include: { profileImages: { include: { image: true } } } },
} as const

const postWithMetadataAndContextInclude = (viewerProfileId: string) =>
  ({
    post: true,
    postedBy: {
      include: {
        profileImages: { include: { image: true } },
        ...conversationContextInclude(viewerProfileId),
      },
    },
  }) as const

export type PostWithMetadata = Prisma.UserContentGetPayload<{
  include: typeof postWithMetadataInclude
}>

export type PostWithMetadataAndContext = Prisma.UserContentGetPayload<{
  include: ReturnType<typeof postWithMetadataAndContextInclude>
}>

export class PostService extends UserContentService {
  private static postInstance: PostService

  static getInstance(): PostService {
    if (!PostService.postInstance) {
      PostService.postInstance = new PostService()
    }
    return PostService.postInstance
  }

  async create(profileId: string, data: CreatePostPayload): Promise<PostWithMetadata> {
    return prisma.userContent.create({
      data: {
        ...this.baseCreateData(data),
        kind: 'post',
        postedById: profileId,
        post: { create: { type: data.type } },
      },
      include: postWithMetadataInclude,
    })
  }

  async update(
    id: string,
    profileId: string,
    data: UpdatePostPayload
  ): Promise<PostWithMetadata | null> {
    const { type, ...baseFields } = data

    return prisma.$transaction(async (tx) => {
      const ok = await this.updateBaseScalars(tx, id, profileId, 'post', baseFields)
      if (!ok) return null

      await tx.postContent.update({
        where: { userContentId: id },
        data: { type },
      })

      return tx.userContent.findFirst({
        where: { id },
        include: postWithMetadataInclude,
      })
    })
  }

  async findByIdHydrated(
    id: string,
    viewerProfileId: string
  ): Promise<PostWithMetadataAndContext | null> {
    return prisma.userContent.findFirst({
      where: {
        id,
        kind: 'post',
        isDeleted: false,
        OR: [{ postedById: viewerProfileId }, { isVisible: true }],
      },
      include: postWithMetadataAndContextInclude(viewerProfileId),
    })
  }

  async findByProfileIdHydrated(
    profileId: string,
    viewerProfileId: string,
    opts: ListOptions
  ): Promise<PostWithMetadataAndContext[]> {
    return prisma.userContent.findMany({
      where: {
        postedById: profileId,
        kind: 'post',
        isDeleted: false,
        isVisible: opts.includeInvisible ? undefined : true,
      },
      include: postWithMetadataAndContextInclude(viewerProfileId),
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.offset,
    })
  }

  // The list-style finders below delegate filtering/pagination to
  // UserContentService and reattach the post content row afterwards. EventService
  // will need the same shape; the duplication is intentional until both sides
  // exist, at which point the pattern can be lifted into the base class as a
  // generic `findHydrated(kind, query, contentInclude)` helper.
  async findFeedHydrated(opts: ListOptions): Promise<PostWithMetadata[]> {
    const metadata = await this.findFeed({ ...opts, kind: 'post' })
    return this.attachPostContent(metadata)
  }

  async findNearbyHydrated(
    lat: number,
    lon: number,
    radiusKm: number,
    opts: ListOptions
  ): Promise<PostWithMetadata[]> {
    const metadata = await this.findNearby(lat, lon, radiusKm, { ...opts, kind: 'post' })
    return this.attachPostContent(metadata)
  }

  private async attachPostContent(rows: UserContentMetadataRow[]): Promise<PostWithMetadata[]> {
    if (rows.length === 0) return []
    const contents = await prisma.postContent.findMany({
      where: { userContentId: { in: rows.map((r) => r.id) } },
    })
    const byId = new Map(contents.map((c) => [c.userContentId, c]))
    return rows.flatMap((r) => {
      const post = byId.get(r.id)
      return post ? [{ ...r, post }] : []
    })
  }
}
