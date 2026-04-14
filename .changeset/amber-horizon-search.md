---
'@opencupid/backend': minor
---

Add /search endpoint: parallel full-text search across tags, profiles, posts, and locations. Backed by Postgres tsvector + GIN indexes on LocalizedProfileField (per-locale dictionary) and Post.content ('simple' dictionary).
