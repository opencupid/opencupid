import { mapProfileSummary } from '@/api/mappers/profile.mappers'
import { profileImageInclude } from '@/db/includes/profileIncludes'
import { prisma } from '@/lib/prisma'
import { MessageService } from './messaging.service'

import { Prisma } from '@prisma/client'
import { InteractionEdgePair, type InteractionEdge } from '@zod/interaction/interaction.dto'

function toLikeEdge(
  profile: Prisma.ProfileGetPayload<{ include: { profileImages: true } }>,
  createdAt: Date,
  isMatch: boolean
): InteractionEdge {
  return {
    profile: mapProfileSummary(profile),
    isMatch,
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

  async like(fromId: string, toId: string): Promise<InteractionEdgePair> {
    if (fromId === toId) throw new Error('Cannot like yourself')

    const { like } = await prisma.$transaction(async tx => {
      await tx.hiddenProfile.deleteMany({ where: { fromId, toId } }) // remove pass if exists

      const like = await tx.likedProfile.upsert({
        where: { fromId_toId: { fromId, toId } },
        update: {},
        create: { fromId, toId },
      })

      return { like }
    })

    const likedProfile = await prisma.profile.findUniqueOrThrow({
      where: { id: toId },
      include: profileImageInclude(),
    })

    const initiatorProfile = await prisma.profile.findUniqueOrThrow({
      where: { id: fromId },
      include: profileImageInclude(),
    })

    const isMatch = await prisma.likedProfile.findUnique({
      where: { fromId_toId: { fromId: toId, toId: fromId } },
    })

    // If this is a match, update any existing conversation status to ACCEPTED
    if (isMatch) {
      const messageService = MessageService.getInstance()
      await messageService.acceptConversationOnMatch(fromId, toId)
    }

    const response: InteractionEdgePair = {
      isMatch: !!isMatch,
      to: toLikeEdge(likedProfile, like.createdAt, !!isMatch),
      from: toLikeEdge(initiatorProfile, like.createdAt, !!isMatch),
    }

    return response
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

  async getLikesReceived(profileId: string): Promise<InteractionEdge[]> {
    const likes = await prisma.likedProfile.findMany({
      where: { toId: profileId },
      include: {
        from: {
          include: profileImageInclude(),
        },
      },
    })

    return likes.map(like => {
      const isMatch = false // Optional: calculate mutual like if needed
      return toLikeEdge(like.from, like.createdAt, isMatch)
    })
  }

  async getLikesSent(profileId: string): Promise<InteractionEdge[]> {
    const likes = await prisma.likedProfile.findMany({
      where: { fromId: profileId },
      include: {
        to: {
          include: profileImageInclude(),
        },
      },
    })

    return likes.map(like => {
      const isMatch = false // Optional: calculate mutual like if needed
      return toLikeEdge(like.to, like.createdAt, isMatch)
    })
  }

  async getMatches(profileId: string): Promise<InteractionEdge[]> {
    const matches = await prisma.likedProfile.findMany({
      where: {
        fromId: profileId,
        to: {
          likesSent: {
            some: { toId: profileId },
          },
        },
      },
      include: {
        to: {
          include: profileImageInclude(),
        },
      },
    })

    return matches.map(like => toLikeEdge(like.to, like.createdAt, true))
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

    await prisma.$transaction(async tx => {
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
    return hidden.map(h => h.toId)
  }
}
