import {
  type InteractionContext,
  type DatingContext,
  DatingContextSchema,
} from '@zod/interaction/interactionContext.dto'
import { DbProfileWithContext } from '@zod/profile/profile.db'

// Maps the viewer's dating interaction state with the target profile.
//
// ⚠️  Naming gotcha: likesReceived/likesSent are from the TARGET's perspective
// but filtered by the VIEWER in interactionContextInclude, so:
//   likesReceived = "likes I (viewer) sent TO this profile"  → likedByMe
//   likesSent     = "likes this profile sent TO me (viewer)" → likedMe
//
// Privacy contract:
//   isAnonymous    — whether MY like is anonymous (my own data, safe to expose)
//   likedMeRevealed — true only when they liked me AND chose to reveal it
//                     (anonymous likes are never exposed to the recipient)
function mapDatingContext(profile: DbProfileWithContext): DatingContext {
  const { likesReceived, likesSent, hiddenBy, ...rest } = profile

  const likedByMe = likesReceived.length > 0 // did I like them?
  const likedMe = likesSent.length > 0 // did they like me?
  const passedByMe = hiddenBy.length > 0
  return {
    likedByMe,
    isAnonymous: likedByMe ? likesReceived[0].isAnonymous : true, // MY like's anonymity (defaults to true when no like)
    likedMeRevealed: likedMe && !likesSent[0].isAnonymous, // true only if they liked me non-anonymously
    passedByMe,
    isMatch: likedByMe && likedMe,
    canLike: !likedByMe,
    canPass: !passedByMe,
    canDate: true,
  }
}

export function mapInteractionContext(
  profile: DbProfileWithContext,
  includeDatingContext: boolean
): InteractionContext {
  const participant = profile.conversationParticipants?.[0]
  const conversation = participant?.conversation
  const initiated =
    !!conversation &&
    conversation.status === 'INITIATED' &&
    conversation.initiatorProfileId !== profile.id

  const canMessage =
    !conversation || // no conversation exists
    (initiated && conversation.status === 'ACCEPTED') || // i initiated and they accepted
    (!initiated && conversation.status !== 'BLOCKED') // they initiated and i didn't block them

  return {
    haveConversation: !!conversation && !initiated,
    canMessage,
    conversationId: canMessage ? (conversation?.id ?? null) : null,
    initiated,
    ...(includeDatingContext ? mapDatingContext(profile) : DatingContextSchema.parse({})),
  }
}
