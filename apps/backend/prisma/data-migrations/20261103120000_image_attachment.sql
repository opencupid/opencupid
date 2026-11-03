-- One-off data migration for 20261103120000_image_attachment (#1581).
--
-- Run BEFORE `prisma migrate deploy` on any database that has gallery data
-- (production, dev), with the backend stopped:
--
--   psql "$DATABASE_URL" -f apps/backend/prisma/data-migrations/20261103120000_image_attachment.sql
--   npx prisma migrate deploy        # reports the migration as already applied
--
-- Empty databases skip this file; `prisma migrate deploy` applies the schema
-- migration directly.
--
-- In one transaction this puts the database into the post-migration shape:
-- it creates ImageAttachment, moves every ProfileImage / UserContentImage
-- membership into it, starts the position sequence above the copied rows,
-- re-syncs Profile.hasFace, drops the old tables, and records the Prisma
-- migration as applied. Any error rolls everything back.

\set ON_ERROR_STOP on
BEGIN;

-- 1) New table (same DDL as the Prisma migration)
CREATE TABLE "ImageAttachment" (
    "imageId" TEXT NOT NULL,
    "profileId" TEXT,
    "userContentId" TEXT,
    "position" SERIAL NOT NULL,

    CONSTRAINT "ImageAttachment_pkey" PRIMARY KEY ("imageId"),
    CONSTRAINT "ImageAttachment_one_gallery_check" CHECK (num_nonnulls("profileId", "userContentId") = 1)
);

-- 2) Move memberships. Each gallery is renumbered 0..n-1 in its current
--    effective order (position, then createdAt, then id), which also repairs
--    the gaps and duplicate positions left by earlier code. An image present
--    in both old tables violates the primary key and aborts the migration
--    (none exist in production at the time of writing).
INSERT INTO "ImageAttachment" ("imageId", "profileId", "position")
SELECT pi."imageId",
       pi."profileId",
       (row_number() OVER (
          PARTITION BY pi."profileId"
          ORDER BY i."position", i."createdAt", i."id"
       ) - 1)::int
FROM "ProfileImage" pi
JOIN "Image" i ON i."id" = pi."imageId";

INSERT INTO "ImageAttachment" ("imageId", "userContentId", "position")
SELECT uci."imageId",
       uci."userContentId",
       (row_number() OVER (
          PARTITION BY uci."userContentId"
          ORDER BY i."position", i."createdAt", i."id"
       ) - 1)::int
FROM "UserContentImage" uci
JOIN "Image" i ON i."id" = uci."imageId";

-- 3) Every later write (append and reorder) draws from the sequence, so start
--    it above every copied position.
SELECT setval(
  pg_get_serial_sequence('"ImageAttachment"', 'position'),
  (SELECT COALESCE(MAX("position"), 0) + 1 FROM "ImageAttachment"),
  false
);

CREATE UNIQUE INDEX "ImageAttachment_profileId_position_key" ON "ImageAttachment"("profileId", "position");
CREATE UNIQUE INDEX "ImageAttachment_userContentId_position_key" ON "ImageAttachment"("userContentId", "position");

ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Re-derive Profile.hasFace from each profile's new primary (lowest-position)
--    attachment; profiles without a gallery get false.
UPDATE "Profile" p
SET "hasFace" = e.has_face
FROM (
  SELECT pr."id",
         COALESCE((
           SELECT i."hasFace"
           FROM "ImageAttachment" a
           JOIN "Image" i ON i."id" = a."imageId"
           WHERE a."profileId" = pr."id"
           ORDER BY a."position"
           LIMIT 1
         ), false) AS has_face
  FROM "Profile" pr
) e
WHERE p."id" = e."id" AND p."hasFace" <> e.has_face;

-- 5) Drop the old join tables
DROP TABLE "ProfileImage";
DROP TABLE "UserContentImage";

-- 6) Migration reconciliation
--
-- The steps above put the database directly into the post-migration shape, so
-- the Prisma migration would fail if `prisma migrate deploy` tried to run its
-- SQL afterwards. Record it as applied so deploy treats it as a no-op. The
-- checksum must match the SHA-256 of the migration file; verify with:
--   sha256sum apps/backend/prisma/migrations/20261103120000_image_attachment/migration.sql

INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
) VALUES (
  gen_random_uuid()::text,
  '15bfffaf02b42791376e64baadea3ddf011c4184abe2a14178c98f419503067d',
  now(),
  '20261103120000_image_attachment',
  NULL,
  NULL,
  now(),
  1
);

COMMIT;
