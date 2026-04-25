---
'@opencupid/backend': patch
---

Extend `acceptConversationOnMatch` to also promote `PENDING` conversations to `ACCEPTED` on a mutual match. Mutual engagement (recipient liking back the sender) is the same legitimacy signal as a message reply — quarantine should not trap a held conversation once both parties have signaled engagement, mirroring the `accept_and_promote_pending` path on the message-reply side. `BLOCKED` and `ARCHIVED` continue to stand as recipient-choice statuses.
