-- 1) New Image table
CREATE TABLE "Image" (
  id               TEXT PRIMARY KEY,
  "ownerProfileId" TEXT NOT NULL REFERENCES "Profile"(id) ON DELETE CASCADE,
  "storagePath"    TEXT NOT NULL UNIQUE,
  "mimeType"       TEXT NOT NULL,
  width            INTEGER,
  height           INTEGER,
  "contentHash"    TEXT,
  blurhash         TEXT,
  "hasFace"        BOOLEAN NOT NULL DEFAULT false,
  "isModerated"    BOOLEAN NOT NULL DEFAULT false,
  "isFlagged"      BOOLEAN NOT NULL DEFAULT false,
  position         INTEGER NOT NULL DEFAULT 0,
  "altText"        TEXT NOT NULL DEFAULT '',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Image_ownerProfileId_idx" ON "Image"("ownerProfileId");

-- 2) Backfill Image from ProfileImage (IDs preserved)
INSERT INTO "Image" (id, "ownerProfileId", "storagePath", "mimeType",
                     width, height, "contentHash", blurhash, "hasFace",
                     "isModerated", "isFlagged", position, "altText",
                     "createdAt", "updatedAt")
SELECT id, "profileId", "storagePath", "mimeType",
       width, height, "contentHash", blurhash, "hasFace",
       "isModerated", "isFlagged", position, "altText",
       "createdAt", "updatedAt"
FROM "ProfileImage";

-- 3) Rebuild ProfileImage as a thin join table
ALTER TABLE "ProfileImage" RENAME TO "ProfileImage_old";

CREATE TABLE "ProfileImage" (
  "imageId"   TEXT PRIMARY KEY REFERENCES "Image"(id) ON DELETE CASCADE,
  "profileId" TEXT NOT NULL REFERENCES "Profile"(id) ON DELETE CASCADE
);
CREATE INDEX "ProfileImage_profileId_idx" ON "ProfileImage"("profileId");

INSERT INTO "ProfileImage" ("imageId", "profileId")
SELECT id, "profileId" FROM "ProfileImage_old";

DROP TABLE "ProfileImage_old";

-- 4) New empty UserContentImage join table
CREATE TABLE "UserContentImage" (
  "imageId"       TEXT PRIMARY KEY REFERENCES "Image"(id) ON DELETE CASCADE,
  "userContentId" TEXT NOT NULL REFERENCES "UserContent"(id) ON DELETE CASCADE
);
CREATE INDEX "UserContentImage_userContentId_idx" ON "UserContentImage"("userContentId");
