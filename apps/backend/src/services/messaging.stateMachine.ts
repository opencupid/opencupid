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
 * The PENDING-non-initiator branch deliberately ignores `senderIsQuarantined`
 * and promotes via `accept_and_promote_pending` even when both parties are in
 * the unvetted window. Mutual engagement is treated as a legitimacy signal
 * that overrides individual quarantine: spam against unsuspecting recipients
 * stays held, but two genuinely-engaging new users can connect immediately.
 * The single-direction quarantine ("hide PENDING from recipients who have not
 * engaged") is by design — not a missing case.
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

  const isInitiator = convo.initiatorProfileId === senderProfileId

  switch (convo.status) {
    case 'PENDING':
      if (isInitiator) return 'pending'
      return 'accept_and_promote_pending'

    case 'INITIATED':
      if (isAdminBroadcast && isInitiator) return 'reply'
      if (!isInitiator) return 'accepted_on_reply'
      return 'blocked'

    case 'ACCEPTED':
      return 'reply'

    case 'BLOCKED':
    case 'ARCHIVED':
    case 'DISCARDED':
      return 'blocked'
  }
}
