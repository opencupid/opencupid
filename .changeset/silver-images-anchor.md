---
'@opencupid/backend': minor
'@opencupid/shared': patch
---

Drop `ProfileImage.userId` column; images are owned solely by `profileId`. Upload route collapses to a single atomic write that creates the row and syncs `Profile.hasFace` in one transaction.
