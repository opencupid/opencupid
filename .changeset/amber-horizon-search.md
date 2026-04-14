---
'@opencupid/backend': minor
---

Add /search endpoint: parallel search across tags, profiles, posts, and locations. Profile and post text use pg_trgm GIN indexes (language-agnostic substring match via ILIKE + similarity ranking) — adding a new app locale requires no database changes.
