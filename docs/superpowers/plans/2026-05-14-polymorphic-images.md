# Polymorphic Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow images to be attached to both `Profile` and `UserContent` entities by renaming `ProfileImage` → `Image` and introducing thin per-owner join tables (`ProfileImage`, `UserContentImage`). Profile DTOs and frontend behavior remain unchanged; UserContent gains a parallel image gallery feature.

**Architecture:** The current `ProfileImage` row already holds all asset-level data (storage path, variants, blurhash, moderation, `position`, `altText`). We rename that table to `Image` (dropping the `profileId` column) and introduce two skinny join tables — `ProfileImage(imageId, profileId)` and `UserContentImage(imageId, userContentId)` — each with `imageId UNIQUE` enforcing the single-owner rule. The `ImageService` is generalized over a tagged `ImageOwner` union; routes move from `/image/...` to `/image/:ownerType/:ownerId/...` with per-owner authz. Dev DB is rebuilt by a destructive Prisma migration; prod uses a hand-authored SQL file that preserves data and inserts its own `_prisma_migrations` row.

**Tech Stack:** Prisma 5, Postgres, Fastify, Vue 3 + Pinia, Vitest, pnpm/Turborepo. Spec: [docs/superpowers/specs/2026-05-14-polymorphic-images-design.md](../specs/2026-05-14-polymorphic-images-design.md).

---

## File Structure

**Backend — created:**
- `apps/backend/prisma/migrations/20260514120000_polymorphic_images/migration.sql` — destructive dev/CI migration (rename + create join tables + drop legacy column).
- `apps/backend/prisma/data-migrations/20260514_polymorphic_images_prod.sql` — hand-authored prod migration (preserves data, writes `_prisma_migrations` row).
- `apps/backend/src/api/routes/image.route.ts` — rewritten to use owner-scoped paths.
- `apps/backend/src/__tests__/api/usercontent-image.route.spec.ts` — new route tests for UserContent owner.

**Backend — modified:**
- `apps/backend/prisma/schema.prisma` — rename model + add join models + back-relations.
- `apps/backend/src/services/image.service.ts` — generalize over `ImageOwner`.
- `apps/backend/src/services/profile.service.ts` — update include shape.
- `apps/backend/src/services/search.service.ts` — update include shape.
- `apps/backend/src/api/mappers/image.mappers.ts` — input type rename.
- `apps/backend/src/api/mappers/profile.mappers.ts` — flatten join rows.
- `apps/backend/src/api/index.ts` — adjust route prefix (`/image` → `/image/:ownerType/:ownerId` handled inside route file).
- `apps/backend/scripts/reprocess-images.ts` — owner-agnostic asset traversal.
- Test files in `apps/backend/src/__tests__/...` matching the 27-file footprint from the spec.

**Shared Zod — modified:**
- `packages/shared/zod/profile/profileimage.dto.ts` — `ProfileImage` DTO is now built from `Image` model.
- `packages/shared/zod/profile/profile.form.ts`, `profile.db.ts`, `profile.dto.ts` — type renames.
- `packages/shared/zod/generated/*` — regenerated via `prisma generate`.

**Shared Zod — created:**
- `packages/shared/zod/image/image.dto.ts` — generalized Image DTO (server side type for ImageOwner, wire DTO).
- `packages/shared/zod/image/usercontent-image.dto.ts` — UserContentImage-specific wire types.

**Frontend — modified:**
- `apps/frontend/src/features/images/stores/imageStore.ts` — parameterized by owner.
- `apps/frontend/src/features/images/__tests__/*` — fixture updates.
- `apps/frontend/src/features/myprofile/...` and `apps/frontend/src/features/browse/...` — fixture updates only (DTO stable).

**Frontend — created (UserContent gallery surface):**
- New consumer in the UserContent editing feature (location TBD by inspection during Task 11 — likely `apps/frontend/src/features/posts/...`).

---

## Task 1: Update Prisma schema with new models

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: Replace the `ProfileImage` block with the renamed `Image` block**

Locate the block at lines 256–282:

```prisma
model ProfileImage {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  profileId String?
  profile   Profile? @relation("ProfileImages", fields: [profileId], references: [id], onDelete: Cascade)
  // ... rest ...
}
```

Replace it with:

```prisma
model Image {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  position    Int      @default(0)
  altText     String   @default("")
  storagePath String   @unique
  url         String?
  width       Int?
  height      Int?
  mimeType    String

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  contentHash String?
  blurhash    String?
  isModerated Boolean  @default(false)
  isFlagged   Boolean  @default(false)
  hasFace     Boolean  @default(false)

  profileImage     ProfileImage?
  userContentImage UserContentImage?

  @@index([userId])
}

model ProfileImage {
  id        String  @id @default(cuid())
  imageId   String  @unique
  image     Image   @relation(fields: [imageId], references: [id], onDelete: Cascade)
  profileId String
  profile   Profile @relation("ProfileImages", fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
}

model UserContentImage {
  id            String      @id @default(cuid())
  imageId       String      @unique
  image         Image       @relation(fields: [imageId], references: [id], onDelete: Cascade)
  userContentId String
  userContent   UserContent @relation(fields: [userContentId], references: [id], onDelete: Cascade)

  @@index([userContentId])
}
```

- [ ] **Step 2: Update the `User` model's image back-relation**

Find this line under `model User`:

```prisma
profileImages ProfileImage[]
```

Replace with:

```prisma
images Image[]
```

- [ ] **Step 3: Verify `Profile` model's back-relation is correct**

The `Profile` model at line ~198 has:

```prisma
profileImages ProfileImage[] @relation("ProfileImages")
```

Leave this unchanged — it now points to the new `ProfileImage` join model with the same relation name. No edit needed.

- [ ] **Step 4: Add `images` back-relation on `UserContent`**

In the `UserContent` model block (~line 396), after the `community CommunityContent?` line, add:

```prisma
images UserContentImage[]
```

- [ ] **Step 5: Generate Prisma client and verify schema validates**

Run: `pnpm --filter backend prisma:generate`
Expected: Prisma client regenerates with no errors. If errors mention "relation field," double-check that the back-relations on `Image`, `Profile`, `User`, and `UserContent` are spelled exactly as above.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/prisma/schema.prisma packages/shared/zod/generated
git commit -m "feat(schema): split ProfileImage into Image + join tables"
```

---

## Task 2: Write the destructive dev/CI Prisma migration

**Files:**
- Create: `apps/backend/prisma/migrations/20260514120000_polymorphic_images/migration.sql`

- [ ] **Step 1: Create the migration directory and file**

```bash
mkdir -p apps/backend/prisma/migrations/20260514120000_polymorphic_images
```

- [ ] **Step 2: Write the SQL**

Write `apps/backend/prisma/migrations/20260514120000_polymorphic_images/migration.sql`:

```sql
-- Polymorphic Images: rename ProfileImage → Image, drop profileId column,
-- introduce ProfileImage / UserContentImage join tables.
--
-- This migration is destructive: any existing rows in ProfileImage will have
-- their profile linkage erased. It is intended only for dev/CI databases that
-- are re-seeded or have throwaway data. Production uses
-- prisma/data-migrations/20260514_polymorphic_images_prod.sql which preserves
-- data and writes its own _prisma_migrations row.

BEGIN;

-- 1. Drop the old FK and index that reference profileId
ALTER TABLE "ProfileImage" DROP CONSTRAINT IF EXISTS "ProfileImage_profileId_fkey";
DROP INDEX IF EXISTS "ProfileImage_profileId_position_idx";

-- 2. Rename ProfileImage → Image (renames the table; PK constraint and indexes follow)
ALTER TABLE "ProfileImage" RENAME TO "Image";
ALTER INDEX "ProfileImage_pkey" RENAME TO "Image_pkey";
ALTER INDEX "ProfileImage_storagePath_key" RENAME TO "Image_storagePath_key";
ALTER INDEX "ProfileImage_userId_idx" RENAME TO "Image_userId_idx";
ALTER TABLE "Image" RENAME CONSTRAINT "ProfileImage_userId_fkey" TO "Image_userId_fkey";

-- 3. Drop the legacy profileId column from Image
ALTER TABLE "Image" DROP COLUMN "profileId";

-- 4. Create the new ProfileImage join table
CREATE TABLE "ProfileImage" (
    "id"        TEXT NOT NULL,
    "imageId"   TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProfileImage_imageId_key" ON "ProfileImage"("imageId");
CREATE INDEX "ProfileImage_profileId_idx" ON "ProfileImage"("profileId");
ALTER TABLE "ProfileImage"
  ADD CONSTRAINT "ProfileImage_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileImage"
  ADD CONSTRAINT "ProfileImage_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Create the UserContentImage join table
CREATE TABLE "UserContentImage" (
    "id"            TEXT NOT NULL,
    "imageId"       TEXT NOT NULL,
    "userContentId" TEXT NOT NULL,
    CONSTRAINT "UserContentImage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserContentImage_imageId_key" ON "UserContentImage"("imageId");
CREATE INDEX "UserContentImage_userContentId_idx" ON "UserContentImage"("userContentId");
ALTER TABLE "UserContentImage"
  ADD CONSTRAINT "UserContentImage_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserContentImage"
  ADD CONSTRAINT "UserContentImage_userContentId_fkey"
    FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
```

- [ ] **Step 3: Apply the migration against the dev database**

Run: `pnpm --filter backend prisma migrate deploy`
Expected: One migration applied (`20260514120000_polymorphic_images`). No errors. If errors mention pre-existing data, dump the dev DB (`docker compose exec db pg_dump ...`), reset (`docker compose down -v db && docker compose up -d db`), and re-run.

- [ ] **Step 4: Verify the dev DB schema**

Run:

```bash
docker compose exec db psql -U appuser -d app -c "\d \"Image\"" \
  -c "\d \"ProfileImage\"" \
  -c "\d \"UserContentImage\""
```

Expected: `Image` has no `profileId` column, both join tables exist with `imageId` unique and the FKs shown above.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/prisma/migrations/20260514120000_polymorphic_images
git commit -m "feat(db): add polymorphic images dev migration"
```

---

## Task 3: Write the prod migration SQL

**Files:**
- Create: `apps/backend/prisma/data-migrations/20260514_polymorphic_images_prod.sql`

- [ ] **Step 1: Create the data-migrations directory and file**

```bash
mkdir -p apps/backend/prisma/data-migrations
```

Write `apps/backend/prisma/data-migrations/20260514_polymorphic_images_prod.sql`:

```sql
-- Production migration for polymorphic images.
--
-- This file is NOT inside prisma/migrations/ and Prisma will not run it
-- automatically. The deployer runs it manually during the release window, in
-- a transaction. It preserves existing ProfileImage data, then writes a row
-- into _prisma_migrations so that `prisma migrate status` reports the
-- corresponding committed Prisma migration as already applied.
--
-- BEFORE RUNNING: replace <SHA256_OF_MIGRATION_SQL> below with the actual
-- checksum of:
--   apps/backend/prisma/migrations/20260514120000_polymorphic_images/migration.sql
-- Compute with: sha256sum migration.sql

BEGIN;

-- 1. Drop the old FK and index on profileId
ALTER TABLE "ProfileImage" DROP CONSTRAINT IF EXISTS "ProfileImage_profileId_fkey";
DROP INDEX IF EXISTS "ProfileImage_profileId_position_idx";

-- 2. Rename ProfileImage → Image
ALTER TABLE "ProfileImage" RENAME TO "Image";
ALTER INDEX "ProfileImage_pkey" RENAME TO "Image_pkey";
ALTER INDEX "ProfileImage_storagePath_key" RENAME TO "Image_storagePath_key";
ALTER INDEX "ProfileImage_userId_idx" RENAME TO "Image_userId_idx";
ALTER TABLE "Image" RENAME CONSTRAINT "ProfileImage_userId_fkey" TO "Image_userId_fkey";

-- 3. Create the new ProfileImage join table (legacy profileId still on Image)
CREATE TABLE "ProfileImage" (
    "id"        TEXT NOT NULL,
    "imageId"   TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProfileImage_imageId_key" ON "ProfileImage"("imageId");
CREATE INDEX "ProfileImage_profileId_idx" ON "ProfileImage"("profileId");
ALTER TABLE "ProfileImage"
  ADD CONSTRAINT "ProfileImage_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileImage"
  ADD CONSTRAINT "ProfileImage_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Create the UserContentImage join table
CREATE TABLE "UserContentImage" (
    "id"            TEXT NOT NULL,
    "imageId"       TEXT NOT NULL,
    "userContentId" TEXT NOT NULL,
    CONSTRAINT "UserContentImage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserContentImage_imageId_key" ON "UserContentImage"("imageId");
CREATE INDEX "UserContentImage_userContentId_idx" ON "UserContentImage"("userContentId");
ALTER TABLE "UserContentImage"
  ADD CONSTRAINT "UserContentImage_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserContentImage"
  ADD CONSTRAINT "UserContentImage_userContentId_fkey"
    FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Backfill ProfileImage join rows from the legacy profileId column
INSERT INTO "ProfileImage" ("id", "imageId", "profileId")
SELECT
  'pi_' || id,
  id,
  "profileId"
FROM "Image"
WHERE "profileId" IS NOT NULL;

-- 6. Verify counts before destroying the source data
DO $$
DECLARE
  src_count int;
  dst_count int;
BEGIN
  SELECT count(*) INTO src_count FROM "Image" WHERE "profileId" IS NOT NULL;
  SELECT count(*) INTO dst_count FROM "ProfileImage";
  IF src_count <> dst_count THEN
    RAISE EXCEPTION 'ProfileImage backfill mismatch: src=%, dst=%', src_count, dst_count;
  END IF;
END $$;

-- 7. Drop the legacy profileId column from Image
ALTER TABLE "Image" DROP COLUMN "profileId";

-- 8. Record the equivalent Prisma migration as applied
INSERT INTO "_prisma_migrations"
  ("id", "checksum", "finished_at", "migration_name",
   "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES
  (gen_random_uuid()::text,
   '<SHA256_OF_MIGRATION_SQL>',
   now(),
   '20260514120000_polymorphic_images',
   NULL, NULL, now(), 1);

COMMIT;
```

- [ ] **Step 2: Add the deployment runbook note**

Open `CLAUDE.md`, find the "Production deployment" section. After step 4 ("Deploy on host") add a new step before step 5 ("Run migrations"):

```markdown
4b. **Run polymorphic-images data migration** (only for the release containing this change):

    Compute the SHA-256 of the dev migration SQL, then paste it into the data-migration file before running:

    ```bash
    sha256sum ~/opencupid/apps/backend/prisma/migrations/20260514120000_polymorphic_images/migration.sql
    # Edit ~/opencupid/apps/backend/prisma/data-migrations/20260514_polymorphic_images_prod.sql
    # and replace <SHA256_OF_MIGRATION_SQL> with the value above.

    docker compose -f docker-compose.production.yml exec -T db \
      psql -U $POSTGRES_USER -d $POSTGRES_DB \
      < ~/opencupid/apps/backend/prisma/data-migrations/20260514_polymorphic_images_prod.sql
    ```
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/prisma/data-migrations/20260514_polymorphic_images_prod.sql CLAUDE.md
git commit -m "feat(db): add prod migration SQL for polymorphic images"
```

---

## Task 4: Update the shared Zod DTOs

**Files:**
- Modify: `packages/shared/zod/profile/profileimage.dto.ts`
- Modify: `packages/shared/zod/profile/profile.form.ts`, `profile.db.ts`, `profile.dto.ts` (type renames only)
- Create: `packages/shared/zod/image/image.dto.ts`
- Create: `packages/shared/zod/image/usercontent-image.dto.ts`

- [ ] **Step 1: Inspect current ProfileImage DTOs**

Run: `cat packages/shared/zod/profile/profileimage.dto.ts`

Identify: the public/owner schemas, the reorder payload schema, the API response wrapper. These define the wire shape that the frontend depends on.

- [ ] **Step 2: Write the new owner discriminator type**

Create `packages/shared/zod/image/image.dto.ts`:

```ts
import { z } from 'zod'

export const ImageOwnerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('profile'), profileId: z.string().cuid() }),
  z.object({ type: z.literal('userContent'), userContentId: z.string().cuid() }),
])

export type ImageOwner = z.infer<typeof ImageOwnerSchema>

export const ImageOwnerRouteParamsSchema = z.object({
  ownerType: z.enum(['profile', 'userContent']),
  ownerId: z.string().cuid(),
})

export type ImageOwnerRouteParams = z.infer<typeof ImageOwnerRouteParamsSchema>
```

- [ ] **Step 3: Update ProfileImage DTO to be sourced from the Image generated schema**

Open `packages/shared/zod/profile/profileimage.dto.ts`. Find imports of `ProfileImageSchema` from `@zod/generated` and replace with imports of `ImageSchema`. Where the file builds `PublicProfileImageSchema` and `OwnerProfileImageSchema`, update them to derive from `ImageSchema` instead of `ProfileImageSchema`. The exported names (`PublicProfileImage`, `OwnerProfileImage`, `ImageApiResponse`) stay the same so the frontend is unaffected.

For example, if the current file contains:

```ts
import { ProfileImageSchema } from '@zod/generated'
export const OwnerProfileImageSchema = ProfileImageSchema.extend({ variants: VariantsSchema })
```

Change to:

```ts
import { ImageSchema } from '@zod/generated'
export const OwnerProfileImageSchema = ImageSchema.extend({ variants: VariantsSchema })
```

- [ ] **Step 4: Mirror the DTO for UserContent images**

Create `packages/shared/zod/image/usercontent-image.dto.ts` with `PublicUserContentImageSchema`, `OwnerUserContentImageSchema`, and `UserContentImageApiResponseSchema` mirroring the ProfileImage versions. Concrete shape:

```ts
import { z } from 'zod'
import { ImageSchema } from '@zod/generated'
import { VariantsSchema } from '@zod/profile/profileimage.dto'  // reuse

export const PublicUserContentImageSchema = ImageSchema.pick({
  id: true,
  altText: true,
  width: true,
  height: true,
  blurhash: true,
}).extend({ variants: VariantsSchema })

export const OwnerUserContentImageSchema = ImageSchema.extend({
  variants: VariantsSchema,
})

export type PublicUserContentImage = z.infer<typeof PublicUserContentImageSchema>
export type OwnerUserContentImage = z.infer<typeof OwnerUserContentImageSchema>

export const UserContentImageApiResponseSchema = z.object({
  success: z.literal(true),
  images: z.array(OwnerUserContentImageSchema),
})

export type UserContentImageApiResponse = z.infer<typeof UserContentImageApiResponseSchema>
```

(If `VariantsSchema` is not currently exported from `profileimage.dto.ts`, export it as part of this task — it's the same shape in both files.)

- [ ] **Step 5: Find and update other references**

Run: `rg "from '@zod/generated'" packages/shared/zod -l`

For each result, check whether it imports `ProfileImageSchema` and update to `ImageSchema`.

Run: `rg "ProfileImageSchema" packages/shared/zod -l`

Expected: only `profileimage.dto.ts` and any DB-level fixture files. Update them to `ImageSchema`.

- [ ] **Step 6: Type-check**

Run: `pnpm type-check`
Expected: errors only in files we will update in later tasks (backend services, mappers, route). No errors in `packages/shared/zod/**`.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/zod
git commit -m "feat(zod): generalize Image DTOs across Profile and UserContent"
```

---

## Task 5: Refactor `image.service.ts` over `ImageOwner`

**Files:**
- Modify: `apps/backend/src/services/image.service.ts`
- Test: `apps/backend/src/__tests__/services/image.service.spec.ts`

This task is TDD. We write tests first against the new API surface, then implement.

- [ ] **Step 1: Locate or create the image.service.spec.ts file**

Run: `ls apps/backend/src/__tests__/services/image.service.spec.ts 2>/dev/null && echo "exists" || echo "create"`

If it doesn't exist, create it with this scaffold:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ImageService } from '@/services/image.service'
import { prisma } from '@/lib/prisma'

describe('ImageService', () => {
  let service: ImageService
  beforeEach(() => { service = ImageService.getInstance() })
})
```

- [ ] **Step 2: Add a failing test for owner-scoped position counting**

Append to `image.service.spec.ts`:

```ts
describe('storeImage position scoping', () => {
  it('counts position within the owner gallery, not the user total', async () => {
    const userId = 'u1'
    const profileA = { type: 'profile', profileId: 'pa' } as const
    const profileB = { type: 'profile', profileId: 'pb' } as const

    // 2 existing images in profileA
    vi.spyOn(prisma.profileImage, 'count').mockResolvedValueOnce(2)

    // The service should request position scoped to profileA, not all of user's images.
    // We inspect the where-clause passed to prisma.profileImage.count.
    const spy = vi.spyOn(prisma.profileImage, 'count')

    await (service as any).computeOwnerPosition({ owner: profileA })

    expect(spy).toHaveBeenCalledWith({ where: { profileId: 'pa' } })
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter backend exec vitest run -t "counts position within the owner"`
Expected: FAIL — `computeOwnerPosition` does not exist yet, OR the where clause uses `userId` instead of `profileId`.

- [ ] **Step 4: Introduce `ImageOwner` type and `computeOwnerPosition` in `image.service.ts`**

At the top of `apps/backend/src/services/image.service.ts`, add:

```ts
import type { ImageOwner } from '@zod/image/image.dto'
```

Add a private method inside the `ImageService` class:

```ts
private async computeOwnerPosition(args: { owner: ImageOwner }): Promise<number> {
  if (args.owner.type === 'profile') {
    return prisma.profileImage.count({ where: { profileId: args.owner.profileId } })
  }
  return prisma.userContentImage.count({ where: { userContentId: args.owner.userContentId } })
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter backend exec vitest run -t "counts position within the owner"`
Expected: PASS.

- [ ] **Step 6: Add a failing test for `storeImage` creating the right join row**

Append:

```ts
describe('storeImage owner linkage', () => {
  it('creates a ProfileImage join row when owner.type === profile', async () => {
    const createImage = vi.spyOn(prisma.image, 'create').mockResolvedValue({ id: 'img1' } as any)
    const createJoin = vi.spyOn(prisma.profileImage, 'create').mockResolvedValue({ id: 'pi1' } as any)
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) =>
      cb({ image: { create: createImage }, profileImage: { create: createJoin } })
    )
    vi.spyOn(service as any, 'processImage').mockResolvedValue({
      mime: 'image/jpeg', blurhash: 'x', hasFace: false, variants: { original: '/tmp/orig.jpg' },
    })

    await service.storeImage('u1', '/tmp/up.jpg', '', { type: 'profile', profileId: 'pa' })

    expect(createJoin).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ imageId: 'img1', profileId: 'pa' }),
    }))
  })

  it('creates a UserContentImage join row when owner.type === userContent', async () => {
    const createImage = vi.spyOn(prisma.image, 'create').mockResolvedValue({ id: 'img2' } as any)
    const createJoin = vi.spyOn(prisma.userContentImage, 'create').mockResolvedValue({ id: 'uci1' } as any)
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) =>
      cb({ image: { create: createImage }, userContentImage: { create: createJoin } })
    )
    vi.spyOn(service as any, 'processImage').mockResolvedValue({
      mime: 'image/jpeg', blurhash: 'x', hasFace: false, variants: { original: '/tmp/orig.jpg' },
    })

    await service.storeImage('u1', '/tmp/up.jpg', '', { type: 'userContent', userContentId: 'uc1' })

    expect(createJoin).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ imageId: 'img2', userContentId: 'uc1' }),
    }))
  })
})
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `pnpm --filter backend exec vitest run -t "storeImage owner linkage"`
Expected: FAIL — `storeImage` signature does not yet accept an owner argument.

- [ ] **Step 8: Rewrite `storeImage` to accept and use `ImageOwner`**

Replace the existing `storeImage` method body. New signature and implementation:

```ts
async storeImage(
  userId: string,
  tmpImagePath: string,
  captionText: string,
  owner: ImageOwner,
): Promise<{ image: Image; ownerRow: { id: string } }> {
  let imageLocation
  try {
    imageLocation = await makeImageLocation(userId)
  } catch (err: any) {
    console.error('Failed to create dest dir', err)
    throw new Error('Failed to create dest dir')
  }

  let processed
  try {
    processed = await this.processImage(
      tmpImagePath,
      imageLocation.absPath,
      imageLocation.base
    )
  } catch (err: any) {
    console.error('Failed to process image', err)
    throw new Error(`Failed to process image ${tmpImagePath}: ${err.message}`)
  }

  const contentHash = await generateContentHash(processed.variants.original)
  const position = await this.computeOwnerPosition({ owner })

  return prisma.$transaction(async (tx) => {
    const image = await tx.image.create({
      data: {
        userId,
        mimeType: processed.mime,
        altText: captionText,
        storagePath: path.join(imageLocation.relPath, imageLocation.base),
        isModerated: false,
        contentHash,
        blurhash: processed.blurhash,
        hasFace: processed.hasFace,
        position,
      },
    })

    const ownerRow = owner.type === 'profile'
      ? await tx.profileImage.create({
          data: { imageId: image.id, profileId: owner.profileId },
        })
      : await tx.userContentImage.create({
          data: { imageId: image.id, userContentId: owner.userContentId },
        })

    return { image, ownerRow }
  })
}
```

Update the import line near the top:

```ts
import type { Image } from '@zod/generated'  // was: import type { ProfileImage } from '@zod/generated'
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `pnpm --filter backend exec vitest run apps/backend/src/__tests__/services/image.service.spec.ts`
Expected: PASS for the four new cases.

- [ ] **Step 10: Refactor `listImages`, `deleteImage`, `reorderImages`, `getImage`**

Replace each method to accept an `ImageOwner` where applicable. Full replacements:

```ts
async listImages(owner: ImageOwner): Promise<Image[]> {
  if (owner.type === 'profile') {
    const rows = await prisma.profileImage.findMany({
      where: { profileId: owner.profileId },
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
    })
    return rows.map(r => r.image)
  }
  const rows = await prisma.userContentImage.findMany({
    where: { userContentId: owner.userContentId },
    include: { image: true },
    orderBy: { image: { position: 'asc' } },
  })
  return rows.map(r => r.image)
}

async getImage(id: string, userId: string): Promise<Image | null> {
  return prisma.image.findFirst({ where: { id, userId } })
}

async deleteImage(owner: ImageOwner, imageId: string): Promise<boolean> {
  const join = owner.type === 'profile'
    ? await prisma.profileImage.findUnique({ where: { imageId } })
    : await prisma.userContentImage.findUnique({ where: { imageId } })

  if (!join) return false
  const ownerMatches = owner.type === 'profile'
    ? (join as any).profileId === owner.profileId
    : (join as any).userContentId === owner.userContentId
  if (!ownerMatches) return false

  const image = await prisma.image.findUnique({ where: { id: imageId } })
  if (!image) return false

  try {
    await prisma.$transaction(async (tx) => {
      if (owner.type === 'profile') {
        await tx.profileImage.delete({ where: { imageId } })
      } else {
        await tx.userContentImage.delete({ where: { imageId } })
      }
      await tx.image.delete({ where: { id: imageId } })
      if (owner.type === 'profile') {
        await syncProfileHasFace(tx, owner.profileId)
      }
    })
  } catch (err) {
    console.error('Error deleting image:', err)
    return false
  }

  const baseFile = path.join(getMediaRoot(), imageBasePath(image.storagePath))
  const filesToDelete = [
    `${baseFile}-original.jpg`,
    `${baseFile}-face.jpg`,
    ...variants.map((size) => `${baseFile}-${size.name}.webp`),
  ]
  for (const f of filesToDelete) {
    try { await fs.promises.unlink(f) } catch (err) { console.warn('Error deleting file:', err) }
  }
  return true
}

async reorderImages(owner: ImageOwner, items: ProfileImagePosition[]): Promise<Image[]> {
  const joinTable = owner.type === 'profile' ? 'profileImage' : 'userContentImage'
  const ownerKey  = owner.type === 'profile' ? 'profileId' : 'userContentId'
  const ownerVal  = owner.type === 'profile' ? owner.profileId : owner.userContentId

  const validRows = await (prisma as any)[joinTable].findMany({
    where: { [ownerKey]: ownerVal, imageId: { in: items.map(i => i.id) } },
    select: { imageId: true },
  })
  const validImageIds = new Set(validRows.map((r: any) => r.imageId))

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!validImageIds.has(item.id)) continue
      await tx.image.update({ where: { id: item.id }, data: { position: item.position } })
    }
    if (owner.type === 'profile') await syncProfileHasFace(tx, owner.profileId)
  })

  return this.listImages(owner)
}
```

- [ ] **Step 11: Run the full image.service.spec.ts**

Run: `pnpm --filter backend exec vitest run apps/backend/src/__tests__/services/image.service.spec.ts`
Expected: any pre-existing tests in this file that still target the old API will now fail. Update those tests to pass an explicit `owner` argument. Re-run until green.

- [ ] **Step 12: Commit**

```bash
git add apps/backend/src/services/image.service.ts apps/backend/src/__tests__/services/image.service.spec.ts
git commit -m "refactor(image.service): generalize over ImageOwner"
```

---

## Task 6: Update `profile.service.ts` and `search.service.ts` include shapes

**Files:**
- Modify: `apps/backend/src/services/profile.service.ts`
- Modify: `apps/backend/src/services/search.service.ts`

- [ ] **Step 1: Find current include sites**

Run: `rg "profileImages:\s*true|profileImages:\s*\{" apps/backend/src/services -n`

For every result, the desired replacement is `profileImages: { include: { image: true } }`.

- [ ] **Step 2: Edit each include site**

For each match, replace `profileImages: true` (or any current include shape) with:

```ts
profileImages: { include: { image: true } }
```

Where the code later accesses `profile.profileImages` and treats elements as the old `ProfileImage` shape (with `storagePath`, `position`, etc.), change to `profile.profileImages.map(pi => pi.image)`.

- [ ] **Step 3: Run service tests**

Run: `pnpm --filter backend exec vitest run apps/backend/src/__tests__/services/profile.service.spec.ts`
Expected: fixture builders in this spec need updating to construct the new include shape — make those edits as failures surface.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services apps/backend/src/__tests__/services
git commit -m "refactor(services): use new profileImages join include shape"
```

---

## Task 7: Update mappers

**Files:**
- Modify: `apps/backend/src/api/mappers/image.mappers.ts`
- Modify: `apps/backend/src/api/mappers/profile.mappers.ts`
- Modify: `apps/backend/src/__tests__/api/profile.mappers.spec.ts`, `apps/backend/src/__tests__/api/mappers.spec.ts`

- [ ] **Step 1: Rename ProfileImage → Image in image.mappers.ts**

Open `apps/backend/src/api/mappers/image.mappers.ts`. Change:

```ts
import { ProfileImage } from '@prisma/client'
```

to:

```ts
import { Image } from '@prisma/client'
```

Update the parameter type of `toOwnerProfileImage` from `ProfileImage` to `Image`. Same for any other function in this file that takes a Prisma `ProfileImage`. The output DTO shape is unchanged.

- [ ] **Step 2: Update profile.mappers.ts join-flattening**

Open `apps/backend/src/api/mappers/profile.mappers.ts`. Find every place that reads `profile.profileImages` and currently iterates over old-shape rows. Each iteration becomes `profile.profileImages.map(pi => pi.image)` — the result is then passed to `toPublicProfileImage` / `toOwnerProfileImage` exactly as before.

Concretely, find `mapProfileImagesToOwner` and similar. If today's code is:

```ts
export function mapProfileImagesToOwner(images: ProfileImage[]): OwnerProfileImage[] {
  return images.map(toOwnerProfileImage)
}
```

Add a new sibling that takes the join shape:

```ts
import type { Image, ProfileImage as ProfileImageJoin } from '@prisma/client'

export function mapProfileJoinRowsToOwner(
  rows: (ProfileImageJoin & { image: Image })[]
): OwnerProfileImage[] {
  return rows.map(r => toOwnerProfileImage(r.image))
}
```

Leave the original `mapProfileImagesToOwner` taking `Image[]` — callers in `profile.service.ts` that already destructured the join in Task 6 pass `Image[]` straight in. Callers that pass the join row shape use the new helper.

- [ ] **Step 3: Update mapper tests**

Open `apps/backend/src/__tests__/api/profile.mappers.spec.ts` and `mappers.spec.ts`. Fixture builders that construct `profileImages: [{ storagePath: ... }]` directly are now constructing join-row shapes. Wrap each old-shape object:

```ts
profileImages: [{ id: 'pi1', imageId: 'i1', profileId: 'p1', image: { /* old shape */ } }]
```

- [ ] **Step 4: Run mapper tests**

Run: `pnpm --filter backend exec vitest run apps/backend/src/__tests__/api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/mappers apps/backend/src/__tests__/api
git commit -m "refactor(mappers): flatten profileImages join rows"
```

---

## Task 8: Rewrite `image.route.ts` for owner-scoped paths

**Files:**
- Modify: `apps/backend/src/api/routes/image.route.ts`
- Modify: `apps/backend/src/api/index.ts`
- Test: `apps/backend/src/__tests__/api/image.route.spec.ts` (existing), `usercontent-image.route.spec.ts` (new)

- [ ] **Step 1: Inspect current route registration**

Open `apps/backend/src/api/index.ts`. Find:

```ts
fastify.register(imageRoutes, { prefix: '/image' })
```

Leave the prefix as `/image`. Routes inside `image.route.ts` will mount on `/:ownerType/:ownerId/...`. So the final paths become `/image/profile/:profileId/...` and `/image/userContent/:userContentId/...`.

- [ ] **Step 2: Write failing tests for the new owner-scoped routes**

If `apps/backend/src/__tests__/api/image.route.spec.ts` does not exist, scaffold it following the pattern of other route specs in that directory (look at e.g. `profile.route.spec.ts` for the Fastify build-and-inject pattern).

Add tests covering:
- `POST /image/profile/:profileId` with multipart upload — 200 if the authenticated user owns the profile, 403 otherwise.
- `POST /image/userContent/:userContentId` — 200 if the authenticated user's profile equals `userContent.postedById`, 403 otherwise.
- `GET /image/profile/:profileId` — returns image list for the authorized owner.
- `DELETE /image/profile/:profileId/:imageId` — 200 success, 403 for non-owner.
- `PATCH /image/profile/:profileId/order` — 200 success.

For each, write the test, run it, see it fail (route doesn't exist yet).

- [ ] **Step 3: Rewrite image.route.ts**

Replace the file with the generalized handlers. Skeleton:

```ts
import { z } from 'zod'
import { FastifyPluginAsync } from 'fastify'
import multipart from '@fastify/multipart'

import { ProfileService } from '@/services/profile.service'
import { ImageService } from '@/services/image.service'
import { prisma } from '@/lib/prisma'
import { uploadTmpDir } from '@/lib/media'
import { rateLimitConfig, sendError, sendForbiddenError } from '../helpers'
import { toOwnerProfileImage } from '@/api/mappers/image.mappers'
import { ReorderProfileImagesPayloadSchema } from '@zod/profile/profileimage.dto'
import { ImageOwnerRouteParamsSchema, type ImageOwner } from '@zod/image/image.dto'
import { appConfig } from '@/lib/appconfig'

const OwnerParamsSchema = ImageOwnerRouteParamsSchema
const OwnerImageParamsSchema = OwnerParamsSchema.extend({ id: z.string().cuid() })

const imageRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, { /* same opts as before */ })
  const profileService = ProfileService.getInstance()
  const imageService = ImageService.getInstance()

  async function resolveOwner(req: any, params: { ownerType: 'profile' | 'userContent'; ownerId: string }): Promise<ImageOwner | null> {
    if (params.ownerType === 'profile') {
      const profile = await profileService.getProfileByUserId(req.user.userId)
      if (!profile || profile.id !== params.ownerId) return null
      return { type: 'profile', profileId: params.ownerId }
    }
    const profile = await profileService.getProfileByUserId(req.user.userId)
    if (!profile) return null
    const uc = await prisma.userContent.findUnique({ where: { id: params.ownerId } })
    if (!uc || uc.postedById !== profile.id) return null
    return { type: 'userContent', userContentId: params.ownerId }
  }

  fastify.get('/:ownerType/:ownerId', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const params = OwnerParamsSchema.parse(req.params)
    const owner = await resolveOwner(req, params)
    if (!owner) return sendForbiddenError(reply)
    const images = await imageService.listImages(owner)
    return reply.code(200).send({ success: true, images: images.map(toOwnerProfileImage) })
  })

  fastify.post('/:ownerType/:ownerId', {
    onRequest: [fastify.authenticate],
    config: rateLimitConfig(fastify, '1 minute', 10),
  }, async (req, reply) => {
    const params = OwnerParamsSchema.parse(req.params)
    const owner = await resolveOwner(req, params)
    if (!owner) return sendForbiddenError(reply)

    let files
    try {
      files = await req.saveRequestFiles({
        tmpdir: uploadTmpDir(),
        limits: { fileSize: appConfig.IMAGE_MAX_SIZE, files: 1, fields: 1 },
      })
    } catch (err: any) {
      fastify.log.warn('Upload error:', err, err.code)
      return sendError(reply, 400, 'Upload failed')
    }

    const file = files[0]
    const captionText = (file.fields?.captionText as any)?.value ?? ''
    const { image } = await imageService.storeImage(req.user.userId, file.filepath, captionText, owner)
    const list = await imageService.listImages(owner)
    return reply.code(200).send({ success: true, images: list.map(toOwnerProfileImage) })
  })

  fastify.delete('/:ownerType/:ownerId/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const params = OwnerImageParamsSchema.parse(req.params)
    const owner = await resolveOwner(req, params)
    if (!owner) return sendForbiddenError(reply)
    const ok = await imageService.deleteImage(owner, params.id)
    if (!ok) return sendError(reply, 404, 'Not found')
    const list = await imageService.listImages(owner)
    return reply.code(200).send({ success: true, images: list.map(toOwnerProfileImage) })
  })

  fastify.patch('/:ownerType/:ownerId/order', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const params = OwnerParamsSchema.parse(req.params)
    const owner = await resolveOwner(req, params)
    if (!owner) return sendForbiddenError(reply)
    const body = ReorderProfileImagesPayloadSchema.parse(req.body)
    const list = await imageService.reorderImages(owner, body.items)
    return reply.code(200).send({ success: true, images: list.map(toOwnerProfileImage) })
  })
}

export default imageRoutes
```

- [ ] **Step 4: Run the route tests**

Run: `pnpm --filter backend exec vitest run apps/backend/src/__tests__/api`
Expected: PASS for all owner/authz cases.

- [ ] **Step 5: Verify backwards-incompatible URL change is acceptable**

The old route was `POST /image` and `GET /image/me`. New routes are `/image/profile/:profileId`. The frontend in Task 9 updates to the new URLs.

Search for any remaining callers:

Run: `rg "'/image'|\"/image/me\"|\"/image\"" apps/frontend apps/admin`

These must all be updated in Task 9.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/api/routes/image.route.ts apps/backend/src/__tests__/api
git commit -m "feat(api): owner-scoped image routes"
```

---

## Task 9: Update frontend `imageStore.ts` to be owner-parameterized

**Files:**
- Modify: `apps/frontend/src/features/images/stores/imageStore.ts`
- Modify: `apps/frontend/src/features/images/__tests__/*`
- Modify: every component file that calls `useImageStore()` (let inspection drive)

- [ ] **Step 1: Inspect call sites**

Run: `rg "useImageStore" apps/frontend -n`

List every consumer. The store will gain an `owner` parameter; each call site updates accordingly.

- [ ] **Step 2: Rewrite imageStore.ts**

Replace the store definition with an owner-parameterized factory. Pinia supports this via `defineStore` per id; we key the store id off the owner.

```ts
import z from 'zod'
import { defineStore } from 'pinia'
import { api, safeApiCall } from '@/lib/api'
import type { ApiError, ApiSuccess } from '@zod/apiResponse.dto'
import {
  type ImageApiResponse,
  ImageApiResponseSchema,
  type OwnerProfileImage,
  type ProfileImagePosition,
} from '@zod/profile/profileimage.dto'
import { bus } from '@/lib/bus'

type ImageStoreResponse = ApiSuccess<{}> | ApiError

export type ImageOwnerKey =
  | { type: 'profile'; profileId: string }
  | { type: 'userContent'; userContentId: string }

function ownerPath(owner: ImageOwnerKey): string {
  return owner.type === 'profile'
    ? `/image/profile/${owner.profileId}`
    : `/image/userContent/${owner.userContentId}`
}

export const useImageStore = (owner: ImageOwnerKey) => {
  const id = owner.type === 'profile'
    ? `image:profile:${owner.profileId}`
    : `image:userContent:${owner.userContentId}`

  return defineStore(id, {
    state: () => ({
      images: [] as OwnerProfileImage[],
      isLoading: false,
    }),
    actions: {
      async fetchImages(): Promise<ImageStoreResponse> {
        try {
          this.isLoading = true
          const { data } = await safeApiCall(() => api.get<ImageApiResponse>(ownerPath(owner)))
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return { success: true }
        } catch (err) {
          return { success: false, message: 'Failed to load images' }
        } finally { this.isLoading = false }
      },

      async uploadImage(file: File, captionText: string): Promise<ImageStoreResponse> {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('captionText', captionText)
        try {
          this.isLoading = true
          const { data } = await safeApiCall(() => api.post<ImageApiResponse>(ownerPath(owner), formData))
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return { success: true }
        } catch (err) {
          return { success: false, message: 'Upload failed' }
        } finally { this.isLoading = false }
      },

      async deleteImage(imageId: string): Promise<ImageStoreResponse> {
        try {
          const { data } = await safeApiCall(() => api.delete<ImageApiResponse>(`${ownerPath(owner)}/${imageId}`))
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return { success: true }
        } catch (err) {
          return { success: false, message: 'Delete failed' }
        }
      },

      async reorder(items: ProfileImagePosition[]): Promise<ImageStoreResponse> {
        try {
          const { data } = await safeApiCall(() => api.patch<ImageApiResponse>(`${ownerPath(owner)}/order`, { items }))
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return { success: true }
        } catch (err) {
          return { success: false, message: 'Reorder failed' }
        }
      },
    },
  })()
}
```

- [ ] **Step 3: Update each call site**

For every `useImageStore()` call found in Step 1, change to `useImageStore({ type: 'profile', profileId })`. The `profileId` typically comes from the auth/me store; check existing code for the canonical accessor.

- [ ] **Step 4: Update frontend tests**

Open each `__tests__/*.spec.ts` under `apps/frontend/src/features/images/` and any tests in `myprofile/`, `browse/` that mount the store. Replace `useImageStore()` with `useImageStore({ type: 'profile', profileId: 'fixture-profile-id' })` and update fixture DTOs if any were tied to the old wire shape (they shouldn't be — DTOs are stable).

- [ ] **Step 5: Run frontend tests**

Run: `pnpm --filter frontend test`
Expected: PASS.

- [ ] **Step 6: Smoke-test in the browser**

Run: `pnpm dev`, navigate to `https://localhost:5173/me/edit`, upload a profile image, reorder, delete. Verify network requests hit `/image/profile/<id>/...`.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend
git commit -m "feat(frontend): owner-parameterized image store"
```

---

## Task 10: Update `scripts/reprocess-images.ts`

**Files:**
- Modify: `apps/backend/scripts/reprocess-images.ts`

- [ ] **Step 1: Read the script**

Run: `cat apps/backend/scripts/reprocess-images.ts`

Identify any `prisma.profileImage.findMany` / `update` calls. They become `prisma.image.findMany` / `update` — the script is asset-level and doesn't care about ownership.

- [ ] **Step 2: Apply the renames**

Replace every `profileImage` Prisma accessor with `image`. Remove any `where: { profileId: ... }` clauses (the column no longer exists).

- [ ] **Step 3: Dry-run the script against the dev DB**

Run: `pnpm --filter backend tsx scripts/reprocess-images.ts --dry-run`
(If `--dry-run` isn't supported, run it normally against a dev DB with a single fixture image.)

Expected: it lists images and processes them without errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/scripts/reprocess-images.ts
git commit -m "refactor(scripts): reprocess-images uses Image accessor"
```

---

## Task 11: Add UserContent image gallery to the post/event/community editing UI

**Files:**
- Inspection task: find the existing UserContent editing component(s) and add an `<ImageUpload>` consumer.
- Modify: at minimum `apps/frontend/src/features/posts/...` or wherever UserContent edit lives.

- [ ] **Step 1: Find the UserContent edit components**

Run: `rg "UserContent|postContent|usercontent" apps/frontend/src/features -l`

Identify the edit view(s). Today the project supports posts/events/communities under UserContent.

- [ ] **Step 2: Mount `<ImageUpload>` parameterized for UserContent**

In the edit component, instantiate the store and the upload UI:

```ts
const store = useImageStore({ type: 'userContent', userContentId: props.contentId })
onMounted(() => store.fetchImages())
```

Reuse the existing `ImageUpload.vue` component. Confirm the component takes the store images as a prop (or reads via injection) — look at its current usage in profile editing and mirror it.

- [ ] **Step 3: Smoke-test**

Run `pnpm dev`, create or edit a UserContent item, upload an image, verify it shows in the gallery, delete it. Verify network requests hit `/image/userContent/<id>/...`.

- [ ] **Step 4: Add a component test for the new consumer**

In `__tests__/` adjacent to the edited component, add a test that mounts the edit view with a stubbed `useImageStore({ type: 'userContent', ... })` and asserts the upload UI renders.

- [ ] **Step 5: Run frontend tests**

Run: `pnpm --filter frontend test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend
git commit -m "feat(usercontent): image gallery on post/event/community edit"
```

---

## Task 12: Full test sweep, type-check, format

- [ ] **Step 1: Run full type-check**

Run: `pnpm type-check`
Expected: PASS across frontend, admin, backend.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 4: Run CI suite (mirrors GitHub Actions)**

Run: `pnpm run ci:test`
Expected: PASS.

- [ ] **Step 5: Format only changed files**

```bash
CHANGED=$(git diff --name-only origin/main..HEAD | grep -E '\.(ts|vue|js|json)$')
pnpm exec prettier --write $CHANGED
```

If formatter produced changes, commit them:

```bash
git add .
git commit -m "chore: format changed files"
```

---

## Task 13: Add changeset, finalize PR

- [ ] **Step 1: Write the changeset**

Create `.changeset/polymorphic-images-feature.md` (pick three random words for the actual filename):

```markdown
---
'@opencupid/backend': minor
'@opencupid/frontend': minor
---

Polymorphic images: attach images to posts/events/communities in addition to profiles.
```

- [ ] **Step 2: Commit**

```bash
git add .changeset
git commit -m "chore: add changeset for polymorphic images"
```

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin feat/polymorphic-images-design
gh pr create --title "feat: polymorphic images for Profile and UserContent" --body "$(cat <<'EOF'
## Summary
- Splits `ProfileImage` into asset (`Image`) + join tables (`ProfileImage`, `UserContentImage`).
- Generalizes `ImageService` and routes over an `ImageOwner` tagged union.
- Adds image gallery support to UserContent (posts, events, communities).
- Dev DB rebuilds via destructive Prisma migration; prod uses hand-authored SQL at `apps/backend/prisma/data-migrations/20260514_polymorphic_images_prod.sql`.

## Test plan
- [ ] `pnpm test` passes
- [ ] `pnpm type-check` passes
- [ ] `pnpm run ci:test` passes
- [ ] Manual: upload/reorder/delete on profile gallery
- [ ] Manual: upload/reorder/delete on a UserContent gallery

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Watch CI in the background**

Dispatch a subagent to watch `gh run watch --exit-status` and report status. Do not block on it; continue with anything else needed.

---

## Self-Review Summary

- **Spec coverage:** Schema (Task 1), dev migration (Task 2), prod migration + runbook (Task 3), Zod DTOs (Task 4), service generalization (Task 5), include-shape propagation (Task 6), mappers (Task 7), owner-scoped routes (Task 8), frontend store (Task 9), reprocess script (Task 10), UserContent UI (Task 11), full verification (Task 12), changeset/PR (Task 13). All spec sections covered.
- **Placeholder scan:** "Inspection task" in Task 11 is intentional — the file path can't be predicted without inspection, but the procedure (`rg`, then mount the existing component) is concrete. No TBDs.
- **Type consistency:** `ImageOwner` is defined in Task 4 (`packages/shared/zod/image/image.dto.ts`), used in Tasks 5, 8, and via the frontend's `ImageOwnerKey` (structurally identical) in Task 9. `computeOwnerPosition`, `storeImage`, `listImages`, `deleteImage`, `reorderImages` all use the same `owner: ImageOwner` parameter shape.
