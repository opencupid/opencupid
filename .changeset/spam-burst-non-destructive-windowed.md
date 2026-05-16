---
'@opencupid/backend': patch
---

Fix SPAM_BURST: hold messages instead of destroying them, and scope the threshold to a 24h window. Held messages are now released to recipients when the flag clears, and old unanswered intros no longer count toward the burst threshold.
