---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

Generalize image attachments: extract `Image` model from `ProfileImage`, add `UserContentImage` join, and expose `/api/content/:contentId/image/*` endpoints for post/event/community galleries.
