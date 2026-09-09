---
'@opencupid/backend': minor
---

Allow UserContent (posts, events, communities) to carry Tags via a new implicit
many-to-many relation, mirroring Profile tagging. Adds `tagIds` to the shared
content create/update payloads and carries content associations through the
admin tag merge. Read-side exposure of tags on content DTOs follows separately.
