---
'@opencupid/frontend': minor
'@opencupid/backend': minor
---

NearbyFeatures strip now fetches posts directly from `/posts/bounds` so clustered posts are no longer hidden from the panel. The `/posts/bounds` response shape changed from `PublicPostWithProfile[]` to the lighter `PostSummary[]` (matches what the strip needs; no existing production consumer relied on the richer shape).
