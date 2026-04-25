---
'@opencupid/backend': patch
---

Refactor `computeSendOutcome` to a status-keyed switch with TypeScript-enforced exhaustiveness on `ConversationStatus`. No behavior change. Documents the design choice that mutual engagement (recipient replying to a quarantined sender's PENDING) promotes the conversation via `accept_and_promote_pending` regardless of the recipient's own quarantine state — engagement is treated as a legitimacy signal that overrides individual quarantine. Adds a test pinning that `isAdminBroadcast` is not consulted when the admin sender is the recipient of a user-initiated INITIATED.
