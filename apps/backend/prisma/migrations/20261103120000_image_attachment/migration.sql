-- Replace the ProfileImage / UserContentImage join tables and the shared
-- Image.position with ImageAttachment (#1581).
--
-- * imageId is the primary key: an image is in at most one gallery.
-- * Exactly one of profileId / userContentId is set (CHECK below).
-- * position comes from a sequence (SERIAL), so new rows always sort last and
--   never collide; UNIQUE (gallery, position) is enforced per gallery kind
--   (NULLs are distinct, so the two kinds never conflict).
-- Image.position stays for MessageImage ordering only.

-- CreateTable
CREATE TABLE "ImageAttachment" (
    "imageId" TEXT NOT NULL,
    "profileId" TEXT,
    "userContentId" TEXT,
    "position" SERIAL NOT NULL,

    CONSTRAINT "ImageAttachment_pkey" PRIMARY KEY ("imageId"),
    CONSTRAINT "ImageAttachment_one_gallery_check" CHECK (num_nonnulls("profileId", "userContentId") = 1)
);

-- Copy memberships. Each gallery is renumbered 0..n-1 in its current effective
-- order (position, then createdAt, then id), which also repairs the gaps and
-- duplicate positions left by earlier code. An image present in both join
-- tables violates the primary key and fails the migration loudly (none exist
-- in production at the time of writing).
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

-- Every later write (append and reorder) draws from the sequence, so start it
-- above every copied position.
SELECT setval(
  pg_get_serial_sequence('"ImageAttachment"', 'position'),
  (SELECT COALESCE(MAX("position"), 0) + 1 FROM "ImageAttachment"),
  false
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageAttachment_profileId_position_key" ON "ImageAttachment"("profileId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ImageAttachment_userContentId_position_key" ON "ImageAttachment"("userContentId", "position");

-- AddForeignKey
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-derive Profile.hasFace from each profile's new primary (lowest-position)
-- attachment; profiles without a gallery get false.
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

-- DropForeignKey
ALTER TABLE "ProfileImage" DROP CONSTRAINT "ProfileImage_imageId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileImage" DROP CONSTRAINT "ProfileImage_profileId_fkey";

-- DropForeignKey
ALTER TABLE "UserContentImage" DROP CONSTRAINT "UserContentImage_imageId_fkey";

-- DropForeignKey
ALTER TABLE "UserContentImage" DROP CONSTRAINT "UserContentImage_userContentId_fkey";

-- DropTable
DROP TABLE "ProfileImage";

-- DropTable
DROP TABLE "UserContentImage";
