-- Data migration: renumber Profile and UserContent gallery positions to a
-- contiguous 0..n-1. Deletes and detaches previously left gaps (galleries
-- starting at 1) and later attaches collided with existing positions
-- (duplicates). Order is preserved; ties are broken by createdAt, then id,
-- matching compactGalleryPositions() in image.service.ts.

UPDATE "Image" i
SET "position" = r.new_position
FROM (
  SELECT im.id,
         (row_number() OVER (
           PARTITION BY pi."profileId"
           ORDER BY im."position", im."createdAt", im.id
         ) - 1)::int AS new_position
  FROM "ProfileImage" pi
  JOIN "Image" im ON im.id = pi."imageId"
) r
WHERE i.id = r.id AND i."position" <> r.new_position;

UPDATE "Image" i
SET "position" = r.new_position
FROM (
  SELECT im.id,
         (row_number() OVER (
           PARTITION BY uci."userContentId"
           ORDER BY im."position", im."createdAt", im.id
         ) - 1)::int AS new_position
  FROM "UserContentImage" uci
  JOIN "Image" im ON im.id = uci."imageId"
) r
WHERE i.id = r.id AND i."position" <> r.new_position;

-- Re-derive Profile.hasFace from the (now unambiguous) position-0 image,
-- mirroring syncProfileHasFace(). Profiles without a gallery get false.
WITH expected AS (
  SELECT p.id,
         COALESCE((
           SELECT im."hasFace"
           FROM "ProfileImage" pi
           JOIN "Image" im ON im.id = pi."imageId"
           WHERE pi."profileId" = p.id AND im."position" = 0
         ), false) AS has_face
  FROM "Profile" p
)
UPDATE "Profile" p
SET "hasFace" = e.has_face
FROM expected e
WHERE p.id = e.id AND p."hasFace" <> e.has_face;
