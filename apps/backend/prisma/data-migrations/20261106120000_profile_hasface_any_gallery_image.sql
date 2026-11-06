-- One-off data migration: Profile.hasFace now means "any gallery image has a
-- face" instead of "the primary gallery image has a face".
--
-- Safe to run before or after deploying the backend, and safe to re-run:
--
--   psql "$DATABASE_URL" -f apps/backend/prisma/data-migrations/20261106120000_profile_hasface_any_gallery_image.sql
--
-- Only flips false -> true. The old rule already set true when the primary image
-- had a face, so no profile needs to go the other way. Raw SQL leaves "updatedAt"
-- unchanged.

\set ON_ERROR_STOP on
BEGIN;

UPDATE "Profile" p
SET "hasFace" = true
WHERE p."hasFace" = false
  AND EXISTS (
    SELECT 1
    FROM "ImageAttachment" a
    JOIN "Image" i ON i."id" = a."imageId"
    WHERE a."profileId" = p."id" AND i."hasFace" = true
  );

COMMIT;
