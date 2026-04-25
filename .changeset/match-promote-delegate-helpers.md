---
'@opencupid/backend': patch
---

Refactor `acceptConversationOnMatch` to delegate the PENDING → ACCEPTED transition to `promoteConversation` + `acceptConversationOnReply`, mirroring the `accept_and_promote_pending` route handler's composition. Single source of truth for the recipient-participant insert and the concurrent-transition status guards across all three promote sites (mutual-match, message-reply, trust-flag-clear). No behavior change.
