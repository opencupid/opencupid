import {
  type InteractionContext,
  type ConversationContext,
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

export function mapConversationContext(
  profile: Pick<DbProfileWithContext, 'id' | 'conversationAsA' | 'conversationAsB'>,
  viewerProfileId: string
): ConversationContext {
  // Self-view short-circuit. The pair-identity walks would surface every
  // conversation where the viewer is in *both* slots — i.e. nothing, since a
  // conversation with oneself doesn't exist — but defensively collapse to
  // inert anyway. There is no "message yourself" operation.
  if (profile.id === viewerProfileId) {
    return { haveConversation: false, canMessage: false, conversationId: null, initiated: false }
  }

  // The include's partial unique index (status != DISCARDED) guarantees at
  // most one Conversation across both pair-identity walks.
  const conversation = profile.conversationAsA?.[0] ?? profile.conversationAsB?.[0] ?? null

  // Did the viewer start this conversation? (profile.id is the target,
  // so initiator !== target means the viewer initiated.)
  const iStarted =
    !!conversation &&
    conversation.initiatorProfileId != null &&
    conversation.initiatorProfileId !== profile.id

  // Is the conversation still waiting for the target's first reply? PENDING
  // (held due to viewer-side quarantine) reads the same as INITIATED from the
  // sender's UX perspective — both mean "I sent, awaiting the other side". The
  // held-vs-delivered distinction is a backend concern, not a UI one.
  const initiated =
    iStarted && (conversation!.status === 'INITIATED' || conversation!.status === 'PENDING')

  const canMessage =
    !conversation || // no conversation exists
    (iStarted && conversation!.status === 'ACCEPTED') || // i initiated and they accepted
    (!iStarted && conversation!.status !== 'BLOCKED') // they initiated and i didn't block them

  return {
    haveConversation: !!conversation && !initiated,
    canMessage,
    conversationId: canMessage || initiated ? (conversation?.id ?? null) : null,
    initiated,
  }
}

export function mapInteractionContext(
  profile: DbProfileWithContext,
  includeDatingContext: boolean,
  viewerProfileId: string
): InteractionContext {
  return {
    ...mapConversationContext(profile, viewerProfileId),
    ...(includeDatingContext ? mapDatingContext(profile) : DatingContextSchema.parse({})),
  }
}
