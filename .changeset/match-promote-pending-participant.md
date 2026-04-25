---
'@opencupid/backend': patch
---

Fix `acceptConversationOnMatch` leaving PENDING conversations without the recipient participant after PENDING → ACCEPTED promotion. PENDING conversations only have the original sender (= initiator) as a participant; on promotion the recipient must be inserted so both sides see the conversation in `listConversationsForProfile`. Without this, both inboxes failed to render the promoted conversation, and the unconsumed match tile incorrectly opened the "send first message" dialog.
