import { Conversation } from '@zod/generated'

export type SendOutcome =
  | 'new_conversation'
  | 'accepted_on_reply'
  | 'reply'
  | 'pending'
  | 'accept_and_promote_pending'
  | 'blocked'

/**
 * Classifies a send against the conversation state machine.
 *
 * | Condition                                                          | Outcome                       |
 * | ------------------------------------------------------------------ | ----------------------------- |
 * | wasCreated AND sender quarantined                                  | 'pending'                     |
 * | wasCreated AND NOT quarantined                                     | 'new_conversation'            |
 * | existing PENDING AND sender = initiator                            | 'pending'                     |
 * | existing PENDING AND sender ≠ initiator                            | 'accept_and_promote_pending'  |
 * | existing INITIATED AND sender ≠ initiator                          | 'accepted_on_reply'           |
 * | existing ACCEPTED                                                  | 'reply'                       |
 * | existing INITIATED AND sender = initiator AND NOT isAdminBroadcast | 'blocked'                     |
 * | existing INITIATED AND sender = initiator AND isAdminBroadcast     | 'reply'                       |
 * | BLOCKED / ARCHIVED / DISCARDED                                     | 'blocked'                     |
 *
 * The self-initiated INITIATED block is an anti-spam rule for human users — don't
 * pile messages onto an unresponsive contact. Admin broadcast traffic legitimately
 * needs to follow up with the same recipients (e.g. announcements after the
 * welcome message), so isAdminBroadcast=true bypasses that one rule. It does NOT
 * override BLOCKED / ARCHIVED / DISCARDED — admins must not be able to override
 * a recipient's explicit block.
 *
 * DISCARDED should never be observed in practice (resolveConversation filters it),
 * but it's included for defensive completeness.
 */
export function computeSendOutcome(
  convo: Pick<Conversation, 'status' | 'initiatorProfileId'>,
  wasCreated: boolean,
  senderProfileId: string,
  senderIsQuarantined: boolean,
  isAdminBroadcast: boolean
): SendOutcome {
  if (wasCreated) {
    return senderIsQuarantined ? 'pending' : 'new_conversation'
  }
  if (convo.status === 'PENDING') {
    return convo.initiatorProfileId === senderProfileId ? 'pending' : 'accept_and_promote_pending'
  }
  if (convo.status === 'INITIATED' && convo.initiatorProfileId !== senderProfileId) {
    return 'accepted_on_reply'
  }
  if (convo.status === 'ACCEPTED') return 'reply'
  if (
    isAdminBroadcast &&
    convo.status === 'INITIATED' &&
    convo.initiatorProfileId === senderProfileId
  ) {
    return 'reply'
  }
  return 'blocked'
}
