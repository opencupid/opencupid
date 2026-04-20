---
'@opencupid/backend': minor
---

Record `User.originDomain` at registration. Every new user now captures the hostname they hit when signing up (normalized to lowercase, port stripped). Existing rows are backfilled to the deploy's `DOMAIN` env via a three-step migration (add nullable → backfill → set NOT NULL). No runtime consumer yet; this is data collection for future per-user brand features.

**Deploy note**: the backfill SQL in `20260420000000_add_user_origin_domain/migration.sql` currently uses the literal `'example.org'`. Substitute with the target environment's `DOMAIN` env before running `prisma migrate deploy` in staging/production.
