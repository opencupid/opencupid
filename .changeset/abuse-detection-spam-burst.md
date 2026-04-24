---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

Add profile abuse detection (SPAM_BURST heuristic). Blocks senders with ≥3 active unreplied conversation initiations at the messaging route; surfaces a localized tooltip on the message button. Reconciliation converges via a BullMQ daily worker and an ad-hoc enqueue on each new-conversation send.
