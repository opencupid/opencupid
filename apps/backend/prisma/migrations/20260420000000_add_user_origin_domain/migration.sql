-- Add required User.originDomain. Production data is backfilled manually,
-- outside `prisma migrate deploy`. The DEFAULT here only protects fresh-install
-- shadow databases (Prisma `migrate dev`) and CI runners that may seed test
-- rows; it's dropped immediately so future inserts must supply a real domain.

ALTER TABLE "User" ADD COLUMN "originDomain" TEXT NOT NULL DEFAULT '__legacy__';
ALTER TABLE "User" ALTER COLUMN "originDomain" DROP DEFAULT;
