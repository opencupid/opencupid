import { Conversation } from '@zod/generated'
import type { SendOutcome } from '@zod/messaging/messaging.dto'

/*
Classifies a send against the conversation state machine. Given the resolved
convo and whether it was just created this transaction, returns which kind
of send this is:

| Condition                                | Outcome              |
| ---------------------------------------- | -------------------- |
| wasCreated = true                        | 'new_conversation'   |
| status = INITIATED, sender ≠ initiator   | 'accepted_on_reply'  |
| status = ACCEPTED                        | 'reply'              |
| status = INITIATED, sender = initiator   | 'blocked'            |
| status = BLOCKED or anything else        | 'blocked'            |

Pure classifier — the 'blocked' outcome is the caller's signal to reject the
send (the route maps it to a 403). Lives in its own module so tests that
mock `messaging.service` leave the state machine real.
*/
export function computeSendOutcome(
  convo: Pick<Conversation, 'status' | 'initiatorProfileId'>,
  wasCreated: boolean,
  senderProfileId: string
): SendOutcome {
  if (wasCreated) return 'new_conversation'
  if (convo.status === 'INITIATED' && convo.initiatorProfileId !== senderProfileId) {
    return 'accepted_on_reply'
  }
  if (convo.status === 'ACCEPTED') return 'reply'
  return 'blocked'
}
