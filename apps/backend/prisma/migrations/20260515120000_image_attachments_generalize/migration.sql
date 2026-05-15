-- Rename existing constraints out of the way so the new ProfileImage table can
-- use the canonical names (avoids _pkey1 / _fkey1 auto-suffixing).
ALTER TABLE "ProfileImage" RENAME CONSTRAINT "ProfileImage_pkey" TO "ProfileImage_old_pkey";
ALTER TABLE "ProfileImage" RENAME CONSTRAINT "ProfileImage_profileId_fkey" TO "ProfileImage_old_profileId_fkey";

-- 1) New Image table
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "ownerProfileId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "contentHash" TEXT,
    "blurhash" TEXT,
    "hasFace" BOOLEAN NOT NULL DEFAULT false,
    "isModerated" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Image_storagePath_key" ON "Image"("storagePath");
CREATE INDEX "Image_ownerProfileId_idx" ON "Image"("ownerProfileId");

ALTER TABLE "Image" ADD CONSTRAINT "Image_ownerProfileId_fkey"
    FOREIGN KEY ("ownerProfileId") REFERENCES "Profile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Backfill Image from ProfileImage (IDs preserved)
INSERT INTO "Image" ("id", "ownerProfileId", "storagePath", "mimeType",
                     "width", "height", "contentHash", "blurhash", "hasFace",
                     "isModerated", "isFlagged", "position", "altText",
                     "createdAt", "updatedAt")
SELECT "id", "profileId", "storagePath", "mimeType",
       "width", "height", "contentHash", "blurhash", "hasFace",
       "isModerated", "isFlagged", "position", "altText",
       "createdAt", "updatedAt"
FROM "ProfileImage";

-- 3) Rebuild ProfileImage as a thin join table
ALTER TABLE "ProfileImage" RENAME TO "ProfileImage_old";

CREATE TABLE "ProfileImage" (
    "imageId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,

    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("imageId")
);

CREATE INDEX "ProfileImage_profileId_idx" ON "ProfileImage"("profileId");

ALTER TABLE "ProfileImage" ADD CONSTRAINT "ProfileImage_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfileImage" ADD CONSTRAINT "ProfileImage_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ProfileImage" ("imageId", "profileId")
SELECT "id", "profileId" FROM "ProfileImage_old";

DROP TABLE "ProfileImage_old";

-- 4) New empty UserContentImage join table
CREATE TABLE "UserContentImage" (
    "imageId" TEXT NOT NULL,
    "userContentId" TEXT NOT NULL,

    CONSTRAINT "UserContentImage_pkey" PRIMARY KEY ("imageId")
);

CREATE INDEX "UserContentImage_userContentId_idx" ON "UserContentImage"("userContentId");

ALTER TABLE "UserContentImage" ADD CONSTRAINT "UserContentImage_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserContentImage" ADD CONSTRAINT "UserContentImage_userContentId_fkey"
    FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
