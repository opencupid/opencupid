---
'@opencupid/backend': patch
---

Declare the pg_trgm GIN indexes in `schema.prisma` so Prisma no longer reads them as drift and proposes dropping them in every generated migration.
