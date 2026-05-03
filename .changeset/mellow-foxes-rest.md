---
'@opencupid/backend': patch
---

Fix DISCARDED conversations leaking into inbox/message views, and bypass PENDING to INITIATED when a quarantined sender messages a mutually-matched recipient.
