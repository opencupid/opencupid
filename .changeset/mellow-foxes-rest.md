---
'@opencupid/backend': patch
---

Fix DISCARDED conversations leaking into inbox/message views; bypass PENDING to INITIATED when a quarantined sender messages a mutually-matched recipient; clear the new-match flag on every engagement send (not just new-conversation creation), so the matches list doesn't keep advertising profiles the user has already messaged.
