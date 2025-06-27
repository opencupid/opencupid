import { Prisma } from "@prisma/client"

export function tagTranslationsInclude(locale: string) {
  return {
    translations: true
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
    tags: {
      include: {
        tag: {
          include: {
            translations: {
              // where: { locale: 'de' },
              select: { name: true, locale: true },
            },
          }
        },
      },
    },
    localized: true,

  } satisfies Prisma.ProfileInclude

  return clause
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
});


export const interactionContextInclude = (myProfileId: string) => {
  return {
    likesReceived: {
      where: { fromId: myProfileId }, // Did I like them?
      select: { id: true },
    },
    likesSent: {
      where: { toId: myProfileId },   // Did they like me?
      select: { id: true },
    },
    hiddenProfiles: {
      where: { fromId: myProfileId }, // Did I pass them?
      select: { id: true },
    },
  }
}