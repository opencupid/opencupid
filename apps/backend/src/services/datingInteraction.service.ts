import { mapProfileSummary } from '@/api/mappers/profile.mappers'
import { profileImageInclude } from '@/db/includes/profileIncludes'
import { prisma } from '@/lib/prisma'

import { Prisma } from '@prisma/client'
import { InteractionEdgePair, type InteractionEdge } from '@zod/datinginteraction/datinginteraction.dto'

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

export class DatingInteractionService {
  private static instance: DatingInteractionService

  public static getInstance(): DatingInteractionService {
    if (!DatingInteractionService.instance) {
      DatingInteractionService.instance = new DatingInteractionService()
    }
    return DatingInteractionService.instance
  }

  private constructor() { }

  async like(fromId: string, toId: string): Promise<InteractionEdgePair> {
    if (fromId === toId) throw new Error('Cannot like yourself')

    await prisma.hiddenProfile.deleteMany({ where: { fromId, toId } }) // remove pass if exists

    const like = await prisma.likedProfile.upsert({
      where: { fromId_toId: { fromId, toId } },
      update: {},
      create: { fromId, toId },
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
          likesSent: {
            none: {
              toId: profileId, // exclude mutual likes
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



  async pass(fromId: string, toId: string): Promise<void> {
    if (fromId === toId) throw new Error('Cannot pass yourself')

    await prisma.likedProfile.deleteMany({ where: { fromId, toId } }) // remove like if exists

    await prisma.hiddenProfile.upsert({
      where: { fromId_toId: { fromId, toId } },
      update: {},
      create: { fromId, toId },
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
