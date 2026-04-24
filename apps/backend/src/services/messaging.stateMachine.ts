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
 * | Condition                                                 | Outcome                       |
 * | --------------------------------------------------------- | ----------------------------- |
 * | wasCreated AND sender quarantined                         | 'pending'                     |
 * | wasCreated AND NOT quarantined                            | 'new_conversation'            |
 * | existing PENDING AND sender = initiator                   | 'pending'                     |
 * | existing PENDING AND sender ≠ initiator                   | 'accept_and_promote_pending'  |
 * | existing INITIATED AND sender ≠ initiator                 | 'accepted_on_reply'           |
 * | existing ACCEPTED                                         | 'reply'                       |
 * | existing INITIATED AND sender = initiator                 | 'blocked'                     |
 * | BLOCKED / ARCHIVED / DISCARDED                            | 'blocked'                     |
 *
 * DISCARDED should never be observed in practice (resolveConversation filters it),
 * but it's included for defensive completeness.
 */
export function computeSendOutcome(
  convo: Pick<Conversation, 'status' | 'initiatorProfileId'>,
  wasCreated: boolean,
  senderProfileId: string,
  senderIsQuarantined: boolean
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
  return 'blocked'
}
