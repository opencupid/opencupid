-- Add required User.originDomain. Production data is backfilled manually,
-- outside `prisma migrate deploy`. Fresh installs (shadow DB, CI, new prod)
-- see this run on an empty `User` table, so a NOT NULL ADD COLUMN suffices.

ALTER TABLE "User" ADD COLUMN "originDomain" TEXT NOT NULL;
