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

  return {
    likedByMe,
    // likedMe,
    passedByMe,
    isMatch: likedByMe && likedMe,
    canLike: !likedByMe,
    canPass: !passedByMe,
  }

}