---
'@opencupid/backend': minor
---

Allow UserContent (posts, events, communities) to carry Tags via a new implicit
many-to-many relation, mirroring Profile tagging. Adds `tagIds` to the shared
content create/update payloads, carries content associations through the admin
tag merge, and exposes a locale-resolved `tags` array on every content DTO.
Content mappers take a `MapperContext` (`viewerProfileId` + `locale`).
