import { InteractionContext } from "@zod/interaction/interactionContext.dto";
import { DbProfileWithContext } from "@zod/profile/profile.db";


export function mapInteractionContext(profile: DbProfileWithContext): InteractionContext {

  const {
    likesReceived,
    likesSent,
    hiddenBy,
    ...rest
  } = profile

  const likedByMe = likesReceived.length > 0
  const likedMe = likesSent.length > 0
  const passedByMe = hiddenBy.length > 0

  const participant = profile.conversationParticipants?.[0]
  const conversation = participant?.conversation
  const canMessage = !conversation || conversation.status === 'ACCEPTED'
  const initiated =
    !!conversation &&
    conversation.status === 'INITIATED' &&
    conversation.initiatorProfileId !== profile.id

  return {
    likedByMe,
    // likedMe,
    passedByMe,
    isMatch: likedByMe && likedMe,
    canLike: !likedByMe,
    canPass: !passedByMe,
    haveConversation: !!conversation && conversation.status === 'ACCEPTED',
    canMessage,
    conversationId: canMessage ? (conversation?.id ?? null) : null,
    initiated,
  }

}