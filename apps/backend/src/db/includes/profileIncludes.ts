import { Prisma } from '@prisma/client'

export function tagTranslationsInclude(locale: string) {
  return {
    translations: true,
  }
}

export function translationWhereClause(term: string, locale: string) {
  return {
    translations: {
      some: {
        locale,
        name: {
          contains: term,
          mode: 'insensitive' as const,
        },
      },
    },
  }
}

export function profileImageInclude() {
  return {
    profileImages: {
      orderBy: { position: 'asc' },
    },
  } satisfies Prisma.ProfileInclude
}

export function tagsInclude() {
  const clause = {
    city: true,
    tags: {
      include: {
        translations: {
          // where: { locale: 'de' },
          select: { name: true, locale: true },
        },
      },
    },
    localized: true,
  } satisfies Prisma.ProfileInclude

  return clause
}

export function blockedContextInclude(myProfileId: string) {
  return {
    blockedByProfiles: {
      where: { id: myProfileId }, // Did I block them?
    },
    blockedProfiles: {
      where: { id: myProfileId }, // Did they block me?
    },
  } satisfies Prisma.ProfileInclude
}

export const conversationContextInclude = (myProfileId: string) => ({
  conversationParticipants: {
    where: {
      conversation: {
        participants: {
          some: {
            profileId: myProfileId,
          },
        },
      },
    },
    include: {
      conversation: true,
    },
  },
})

export const interactionContextInclude = (myProfileId: string) => {
  return {
    likesReceived: {
      where: { fromId: myProfileId }, // Did I like them?
    },
    likesSent: {
      where: { toId: myProfileId }, // Did they like me?
    },
    hiddenBy: {
      where: { fromId: myProfileId }, // Did I pass them?
    },
  }
}
