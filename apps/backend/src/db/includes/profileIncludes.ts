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

/**
 * Prisma includes for computing the viewer ↔ target interaction state.
 *
 * ⚠️  The relation names are from the **target profile's** perspective, but the
 * WHERE clauses filter them relative to the **viewer** (myProfileId). This
 * flips the apparent direction:
 *
 *   likesReceived  →  likes the target *received* FROM myProfileId  →  "did I like them?"
 *   likesSent      →  likes the target *sent* TO myProfileId        →  "did they like me?"
 *   hiddenBy       →  hides placed on the target BY myProfileId     →  "did I pass them?"
 */
export const interactionContextInclude = (myProfileId: string) => {
  return {
    likesReceived: {
      where: { fromId: myProfileId }, // likes FROM me → target  ("did I like them?")
    },
    likesSent: {
      where: { toId: myProfileId }, // likes FROM target → me  ("did they like me?")
    },
    hiddenBy: {
      where: { fromId: myProfileId }, // hides BY me on target  ("did I pass them?")
    },
  }
}
