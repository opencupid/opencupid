import type { PrismaClient } from '@prisma/client'
import { ProfileMatchService } from './profileMatch.service'
import { PostService } from './post.service'
import { mapProfileToPublic } from '../api/mappers/profile.mappers'
import { mapDbPostToPublic } from '../api/mappers/post.mappers'
import { mapProfileTagsTranslated } from '../api/mappers/tag.mappers'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'
import type { PublicPostWithProfile } from '@zod/post/post.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import type { Bounds } from '@shared/zod/dto/bounds.dto'

export class BrowseService {
  private static instance: BrowseService

  private constructor(private readonly prisma: PrismaClient) {}

  public static getInstance(prisma?: PrismaClient): BrowseService {
    if (!BrowseService.instance) {
      if (!prisma) {
        throw new Error('BrowseService requires PrismaClient on first instantiation')
      }
      BrowseService.instance = new BrowseService(prisma)
    }
    return BrowseService.instance
  }

  async findInBounds(
    viewerProfileId: string,
    bounds: Bounds,
    locale: string
  ): Promise<{
    profiles: PublicProfileWithContext[]
    posts: PublicPostWithProfile[]
    tags: PublicTag[]
  }> {
    const profileMatchService = ProfileMatchService.getInstance()
    const postService = PostService.getInstance(this.prisma)

    const [rawProfiles, rawPosts] = await Promise.all([
      profileMatchService.findSocialProfilesInBounds(
        viewerProfileId,
        bounds,
        [],
        [{ updatedAt: 'desc' }]
      ),
      postService.findInBounds(bounds),
    ])

    const profiles = rawProfiles.map((p) => mapProfileToPublic(p, false, locale))
    const posts = rawPosts.map((p) => mapDbPostToPublic(p, viewerProfileId))

    // Derive unique tags from profile results (posts carry no tags)
    const tagMap = new Map<string, PublicTag>()
    for (const profile of rawProfiles) {
      const translatedTags = mapProfileTagsTranslated(profile.tags ?? [], locale)
      for (const tag of translatedTags) {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag)
        }
      }
    }
    const tags = Array.from(tagMap.values())

    return { profiles, posts, tags }
  }
}
