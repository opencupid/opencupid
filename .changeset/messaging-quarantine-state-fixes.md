---
'@opencupid/backend': patch
'@opencupid/shared': patch
---

Fix correctness gaps in the messaging quarantine state machine: self-view no longer leaks `canMessage=true` / a stale conversationId; mutual matches now promote held PENDING conversations to ACCEPTED and insert the missing recipient participant; and the sender's own held PENDING is now visible to their `canMessage` check. Also refactors `computeSendOutcome` to a status-keyed switch with TS-enforced exhaustiveness.
