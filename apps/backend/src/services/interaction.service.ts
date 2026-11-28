import { mapProfileSummary } from '@/api/mappers/profile.mappers'
import { profileImageInclude } from '@/db/includes/profileIncludes'
import { prisma } from '@/lib/prisma'
import { MessageService } from './messaging.service'
import { pairEligibility, withVisibleImages } from './restrictedPhotoGrant'

import { Prisma } from '@prisma/client'
import {
  InteractionEdgePair,
  type InteractionEdge,
  type ReceivedLike,
} from '@zod/interaction/interaction.dto'

function toLikeEdge(
  profile: Prisma.ProfileGetPayload<{
    include: { profileImages: { include: { image: true } } }
  }>,
  createdAt: Date,
  isMatch: boolean,
  isNew = true,
  isAnonymous = true
): InteractionEdge {
  return {
    profile: mapProfileSummary(profile),
    isMatch,
    isNew,
    isAnonymous,
    createdAt: createdAt.toISOString(),
  }
}

export class InteractionService {
  private static instance: InteractionService

  public static getInstance(): InteractionService {
    if (!InteractionService.instance) {
      InteractionService.instance = new InteractionService()
    }
    return InteractionService.instance
  }

  private constructor() {}

  async like(
    fromId: string,
    toId: string,
    isAnonymous = true
  ): Promise<InteractionEdgePair & { isNewLike: boolean }> {
    if (fromId === toId) throw new Error('Cannot like yourself')

    const { like, isNewLike } = await prisma.$transaction(async (tx) => {
      await tx.hiddenProfile.deleteMany({ where: { fromId, toId } }) // remove pass if exists

      const existing = await tx.likedProfile.findUnique({
        where: { fromId_toId: { fromId, toId } },
      })

      const like = await tx.likedProfile.upsert({
        where: { fromId_toId: { fromId, toId } },
        update: { isAnonymous },
        create: { fromId, toId, isAnonymous },
      })

      return { like, isNewLike: !existing }
    })

    const { likedProfile, initiatorProfile } = await this.loadLikePair(fromId, toId)

    const isMatch = await prisma.likedProfile.findUnique({
      where: { fromId_toId: { fromId: toId, toId: fromId } },
    })

    // If this is a match, update any existing conversation status to ACCEPTED
    if (isMatch) {
      const messageService = MessageService.getInstance()
      await messageService.acceptConversationOnMatch(fromId, toId)
    }

    const response: InteractionEdgePair & { isNewLike: boolean } = {
      isMatch: !!isMatch,
      to: toLikeEdge(likedProfile, like.createdAt, !!isMatch, like.isNew, like.isAnonymous),
      from: toLikeEdge(initiatorProfile, like.createdAt, !!isMatch, like.isNew, like.isAnonymous),
      isNewLike,
    }

    return response
  }

  async updateLike(
    fromId: string,
    toId: string,
    data: { isAnonymous: boolean }
  ): Promise<InteractionEdgePair> {
    const like = await prisma.likedProfile.update({
      where: { fromId_toId: { fromId, toId } },
      data: { isAnonymous: data.isAnonymous },
    })

    const { likedProfile, initiatorProfile } = await this.loadLikePair(fromId, toId)

    const isMatch = await prisma.likedProfile.findUnique({
      where: { fromId_toId: { fromId: toId, toId: fromId } },
    })

    return {
      isMatch: !!isMatch,
      to: toLikeEdge(likedProfile, like.createdAt, !!isMatch, like.isNew, like.isAnonymous),
      from: toLikeEdge(initiatorProfile, like.createdAt, !!isMatch, like.isNew, like.isAnonymous),
    }
  }

  /**
   * Both ends of a like, for a payload that goes to both: the liker's response
   * and the target's WebSocket event. Galleries are filtered with the pair's
   * eligibility, so neither end gets more than the other may see.
   */
  private async loadLikePair(fromId: string, toId: string) {
    const [likedProfile, initiatorProfile, isEligible] = await Promise.all([
      prisma.profile.findUniqueOrThrow({
        where: { id: toId },
        include: profileImageInclude({ includeRestricted: true }),
      }),
      prisma.profile.findUniqueOrThrow({
        where: { id: fromId },
        include: profileImageInclude({ includeRestricted: true }),
      }),
      pairEligibility([[fromId, toId]]),
    ])
    const canSee = isEligible(fromId, toId)
    return {
      likedProfile: withVisibleImages(likedProfile, canSee),
      initiatorProfile: withVisibleImages(initiatorProfile, canSee),
    }
  }

  async unlike(fromId: string, toId: string): Promise<void> {
    await prisma.likedProfile.deleteMany({
      where: { fromId, toId },
    })
  }

  async getLikesReceivedCount(profileId: string): Promise<number> {
    return prisma.likedProfile.count({
      where: {
        toId: profileId,
        from: {
          likesReceived: {
            none: {
              fromId: profileId, // exclude mutual likes
            },
          },
        },
      },
    })
  }

  async getLikesReceived(profileId: string, limit?: number): Promise<ReceivedLike[]> {
    const likes = await prisma.likedProfile.findMany({
      where: {
        toId: profileId,
        from: {
          likesReceived: {
            none: {
              fromId: profileId, // exclude mutual likes (same filter as count)
            },
          },
        },
      },
      orderBy: [{ isAnonymous: 'asc' }, { createdAt: 'desc' }],
      ...(limit ? { take: limit } : {}),
      include: {
        from: {
          include: profileImageInclude({ includeRestricted: true }),
        },
      },
    })
    const isEligible = await pairEligibility(likes.map((l) => [profileId, l.fromId] as const))

    return likes.map((like) => ({
      profile: like.isAnonymous
        ? null
        : mapProfileSummary(withVisibleImages(like.from, isEligible(profileId, like.fromId))),
      isMatch: false,
      isNew: like.isNew,
      isAnonymous: like.isAnonymous,
      createdAt: like.createdAt.toISOString(),
    }))
  }

  async getLikesSent(profileId: string): Promise<InteractionEdge[]> {
    const likes = await prisma.likedProfile.findMany({
      where: { fromId: profileId },
      include: {
        to: {
          include: profileImageInclude({ includeRestricted: true }),
        },
      },
    })
    const isEligible = await pairEligibility(likes.map((l) => [profileId, l.toId] as const))

    return likes.map((like) =>
      toLikeEdge(
        withVisibleImages(like.to, isEligible(profileId, like.toId)),
        like.createdAt,
        false,
        like.isNew,
        like.isAnonymous
      )
    )
  }

  async getMatches(profileId: string): Promise<InteractionEdge[]> {
    const matches = await prisma.likedProfile.findMany({
      where: {
        fromId: profileId,
        isNew: true,
        to: {
          likesSent: {
            some: { toId: profileId },
          },
        },
      },
      include: {
        to: {
          include: profileImageInclude({ includeRestricted: true }),
        },
      },
    })
    const isEligible = await pairEligibility(matches.map((l) => [profileId, l.toId] as const))

    return matches.map((like) =>
      toLikeEdge(
        withVisibleImages(like.to, isEligible(profileId, like.toId)),
        like.createdAt,
        true,
        like.isNew,
        like.isAnonymous
      )
    )
  }

  async getNewMatchesCount(profileId: string): Promise<number> {
    return await prisma.likedProfile.count({
      where: {
        fromId: profileId,
        to: {
          likesSent: {
            some: { toId: profileId },
          },
        },
        isNew: true, // Only fetch new matches
      },
    })
  }

  /**
   * Marks any mutual likes between profileA and profileB as no longer "new".
   */
  async markMatchAsSeen(profileAId: string, profileBId: string): Promise<void> {
    await prisma.likedProfile.updateMany({
      where: {
        OR: [
          { fromId: profileAId, toId: profileBId, isNew: true },
          { fromId: profileBId, toId: profileAId, isNew: true },
        ],
      },
      data: {
        isNew: false,
      },
    })
  }

  async pass(fromId: string, toId: string): Promise<void> {
    if (fromId === toId) throw new Error('Cannot pass yourself')

    await prisma.$transaction(async (tx) => {
      // Remove likes in both directions if a match exists
      await tx.likedProfile.deleteMany({
        where: {
          OR: [
            { fromId, toId },
            { fromId: toId, toId: fromId },
          ],
        },
      })
      // Hide the profile from view (unidirectional)
      await tx.hiddenProfile.upsert({
        where: { fromId_toId: { fromId, toId } },
        update: {},
        create: { fromId, toId },
      })
    })
  }

  async unpass(fromId: string, toId: string): Promise<void> {
    await prisma.hiddenProfile.deleteMany({ where: { fromId, toId } })
  }

  async getHiddenProfileIds(profileId: string): Promise<string[]> {
    const hidden = await prisma.hiddenProfile.findMany({
      where: { fromId: profileId },
      select: { toId: true },
    })
    return hidden.map((h) => h.toId)
  }
}
