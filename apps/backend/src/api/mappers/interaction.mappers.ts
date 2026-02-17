import {
  type InteractionContext,
  type DatingContext,
  DatingContextSchema,
} from '@zod/interaction/interactionContext.dto'
import { DbProfileWithContext } from '@zod/profile/profile.db'

function mapDatingContext(profile: DbProfileWithContext): DatingContext {
  const { likesReceived, likesSent, hiddenBy, ...rest } = profile

  const likedByMe = likesReceived.length > 0
  const likedMe = likesSent.length > 0
  const passedByMe = hiddenBy.length > 0
  return {
    likedByMe,
    // likedMe,
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
