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
    galleryImages: {
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
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

/**
 * Surfaces the single active Conversation between the target profile and the
 * viewer (if any), via Profile's two pair-identity relations:
 *   target.conversationAsA WHERE profileBId=viewer
 *   target.conversationAsB WHERE profileAId=viewer
 *
 * The partial unique index on (profileAId, profileBId) WHERE status<>DISCARDED
 * guarantees at most one row across both walks, so the mapper just picks
 * `conversationAsA[0] ?? conversationAsB[0]`.
 *
 * Visibility rules baked into the WHERE clauses:
 *   - DISCARDED conversations are excluded (terminal state — should not drive
 *     interaction context).
 *   - PENDING is only visible to the initiator (sender of the held message).
 *     Other statuses are visible to either side. This keeps the recipient
 *     blind to held PENDINGs they didn't originate (anti-spam guarantee) while
 *     letting the sender see their own held conversation so the GUI can gate
 *     `canMessage` correctly.
 */
export const conversationContextInclude = (myProfileId: string) => {
  const visibilityClause: Pick<Prisma.ConversationWhereInput, 'OR'> = {
    OR: [
      { status: { in: ['INITIATED', 'ACCEPTED', 'BLOCKED', 'ARCHIVED'] } },
      { status: 'PENDING', initiatorProfileId: myProfileId },
    ],
  }
  return {
    conversationAsA: {
      where: { profileBId: myProfileId, ...visibilityClause },
    },
    conversationAsB: {
      where: { profileAId: myProfileId, ...visibilityClause },
    },
  }
}

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
