# Polymorphic Images: Profile and UserContent

**Status:** Design approved, pending implementation plan
**Date:** 2026-05-14
**Scope:** Backend schema + services + routes, frontend store + components, dev migration, prod migration runbook

## Goal

Extend the existing `ProfileImage` system so that images can also be attached to `UserContent` rows (posts, events, communities). Keep the full image pipeline (variants, blurhash, face detection, moderation, dedup) intact. Out of scope: attaching images to `Message` (uses `MessageAttachment` today for audio; revisit later).

## Approach

Rename the current `ProfileImage` table to `Image` (it already carries all the asset-level data), and introduce thin per-owner join tables that link an Image to its owning entity:

- `ProfileImage` — join row `(imageId UNIQUE, profileId)`
- `UserContentImage` — join row `(imageId UNIQUE, userContentId)`

An Image is owned by **exactly one** join row (single-owner rule). Per-image metadata that varies by relationship — `position`, `altText` — stays on the `Image` row itself, because the single-owner rule means there is no ambiguity about which gallery they describe.

Rejected alternatives (with reasons):

- **String discriminator (`ownerType` + `ownerId` on Image)** — loses referential integrity; conflicts with the project's data-integrity policy.
- **Nullable FKs (`profileId?`, `userContentId?` on Image with CHECK constraint)** — Prisma cannot model "exactly one of N FKs is set" natively, and the CHECK pattern grows fragile as owner types are added.
- **Cross-owner image sharing with reference counting** — explicitly rejected. Single-owner means deletes are simple and no orphan-sweeper worker is needed.

## Schema

### `Image` (renamed from `ProfileImage`, `profileId` removed)

```prisma
model Image {
  id          String   @id @default(cuid())
  userId      String                     // uploader (existing semantics)
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

  profileImage     ProfileImage?      // back-relation, 0..1
  userContentImage UserContentImage?  // back-relation, 0..1

  @@index([userId])
}
```

### `ProfileImage` (new, thin join row)

```prisma
model ProfileImage {
  id        String  @id @default(cuid())
  imageId   String  @unique
  image     Image   @relation(fields: [imageId], references: [id], onDelete: Cascade)
  profileId String
  profile   Profile @relation("ProfileImages", fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
}
```

### `UserContentImage` (new)

```prisma
model UserContentImage {
  id            String      @id @default(cuid())
  imageId       String      @unique
  image         Image       @relation(fields: [imageId], references: [id], onDelete: Cascade)
  userContentId String
  userContent   UserContent @relation(fields: [userContentId], references: [id], onDelete: Cascade)

  @@index([userContentId])
}
```

### Back-relations

```prisma
model Profile {
  // ...existing fields...
  profileImages ProfileImage[] @relation("ProfileImages")
}

model UserContent {
  // ...existing fields...
  images UserContentImage[]
}
```

### Cascade semantics

- Profile deleted → `ProfileImage` rows cascade-delete.
- `Image` rows are **not** cascade-deleted by Profile deletion (FK direction is Image ← ProfileImage). The application-level guarantee (in `image.service.ts`) is that whenever a join row is deleted, the corresponding `Image` row **and its on-disk files** are deleted in the same transaction. Same pattern as today's `deleteImage` flow at [image.service.ts:222-236](../../apps/backend/src/services/image.service.ts#L222-L236), extended to userContent.
- The `imageId UNIQUE` constraint on each join table enforces "at most one join row per Image" within that table. Cross-table single-owner is enforced by the upload flow, which creates the Image and its join row in one transaction and never re-links.

## Backend services

### `image.service.ts`

Generalize over owner. Introduce a tagged union:

```ts
type ImageOwner =
  | { type: 'profile'; profileId: string }
  | { type: 'userContent'; userContentId: string }
```

Method changes:

| Method                                  | Change                                                                                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storeImage(userId, fileUpload, owner)` | Creates `Image` row + matching join row in one transaction. Position is the count of existing siblings *within the owner's gallery*, not within the user's total uploads.                    |
| `listImages(owner)`                     | Returns images for one owner, ordered by `image.position`. Replaces `listImages(userId)`.                                                                                                    |
| `deleteImage(owner, imageId)`           | Verifies join row matches the given owner. Deletes join row + Image row + files in one transaction. Calls `syncProfileHasFace` only when `owner.type === 'profile'`.                         |
| `reorderImages(owner, items)`           | Filters target Images by join-row owner before updating `position`.                                                                                                                          |
| `getImage(id, userId)`                  | Unchanged; scoped by uploader.                                                                                                                                                               |

### Mappers

- `image.mappers.ts`: input type changes from `ProfileImage` to `Image`. DTO shape unchanged — `position` and `altText` are still on Image.
- `profile.mappers.ts`: every Prisma include of `profileImages: true` becomes `profileImages: { include: { image: true } }`. Mapper reads `profile.profileImages.map(pi => pi.image)`. DTO output unchanged.
- `search.service.ts`: same include-shape change at result-hydration sites.

### Routes

Generalize `apps/backend/src/api/routes/image.route.ts` to operate on an owner key passed in the URL:

```text
POST   /images/:ownerType/:ownerId         upload (multipart)
GET    /images/:ownerType/:ownerId         list
PATCH  /images/:ownerType/:ownerId/order   reorder
DELETE /images/:ownerType/:ownerId/:id     delete
```

Per-owner authorization:

- `profile` — request user must own the Profile.
- `userContent` — request user's Profile must be `userContent.postedById`.

The 403 paths are tested explicitly.

## Frontend

The DTO contract for Profile images is **kept stable** — the backend mapper flattens `profile.profileImages[].image` so the wire shape matches today's `ProfileImage` DTO. Existing components (`ImageUpload.vue`, `ProfileImage.vue`, `ProfileThumbnail.vue`) work unchanged for the Profile flow.

### Store generalization

`apps/frontend/src/features/images/stores/imageStore.ts` is parameterized by owner. Current shape `useImageStore()` (implicitly Profile-scoped) becomes `useImageStore(owner: ImageOwnerKey)` where `ImageOwnerKey = { type: 'profile' | 'userContent'; ownerId: string }`. The store's internal state, upload/list/reorder/delete methods become owner-aware. API calls route to `/images/:ownerType/:ownerId/...`.

### New UI surfaces

UserContent editing flows (post/event/community edit views) gain an image gallery powered by the same `ImageUpload.vue` component, parameterized with a `userContent`-typed owner. No new gallery component is built; the existing one is reused.

## Migration strategy

### Dev / CI / test

A single Prisma migration `20260514120000_polymorphic_images/migration.sql` ships in `prisma/migrations/`. It contains pure DDL:

1. `ALTER TABLE "ProfileImage" RENAME TO "Image"` and rename indexes (`ProfileImage_userId_idx` → `Image_userId_idx`, drop `ProfileImage_profileId_position_idx` since `profileId` is dropped).
2. `ALTER TABLE "Image" DROP COLUMN "profileId"`.
3. `CREATE TABLE "ProfileImage" ( id, imageId, profileId, ... )` with `imageId UNIQUE`, FKs, `@@index([profileId])`.
4. `CREATE TABLE "UserContentImage" ( id, imageId, userContentId, ... )` likewise.

This migration **does not preserve data** — it's destructive of the legacy `profileId` linkage. That is acceptable for dev/CI databases (they're throwaway or re-seeded). Running this migration on prod as-is would orphan all profile images, so prod uses a different path (below).

### Production

A hand-authored one-off SQL file at `apps/backend/prisma/data-migrations/20260514_polymorphic_images_prod.sql`. **It lives outside `prisma/migrations/` so Prisma will not auto-pick it up.** The deploy runbook references it explicitly.

Structure:

```sql
BEGIN;

-- Step 1: rename ProfileImage to Image (keep profileId column for now)
ALTER TABLE "ProfileImage" RENAME TO "Image";
ALTER INDEX "ProfileImage_userId_idx" RENAME TO "Image_userId_idx";
ALTER INDEX "ProfileImage_profileId_position_idx" RENAME TO "Image_profileId_position_idx_tmp";

-- Step 2: create join tables
CREATE TABLE "ProfileImage" (
  "id"        TEXT PRIMARY KEY,
  "imageId"   TEXT NOT NULL UNIQUE REFERENCES "Image"("id") ON DELETE CASCADE,
  "profileId" TEXT NOT NULL REFERENCES "Profile"("id") ON DELETE CASCADE
);
CREATE INDEX "ProfileImage_profileId_idx" ON "ProfileImage"("profileId");

CREATE TABLE "UserContentImage" (
  "id"            TEXT PRIMARY KEY,
  "imageId"       TEXT NOT NULL UNIQUE REFERENCES "Image"("id") ON DELETE CASCADE,
  "userContentId" TEXT NOT NULL REFERENCES "UserContent"("id") ON DELETE CASCADE
);
CREATE INDEX "UserContentImage_userContentId_idx" ON "UserContentImage"("userContentId");

-- Step 3: backfill ProfileImage rows from the legacy column
INSERT INTO "ProfileImage" (id, "imageId", "profileId")
SELECT
  -- New PK derived from the image id for deterministic, idempotent backfill.
  -- 'pi_' prefix distinguishes it from raw cuid ids in logs; the rest of the
  -- id is the original Image cuid, guaranteeing uniqueness without UUID gen.
  'pi_' || id,
  id,
  "profileId"
FROM "Image"
WHERE "profileId" IS NOT NULL;

-- Step 4: verify row counts; abort if mismatch
DO $$
DECLARE src_count int; dst_count int;
BEGIN
  SELECT count(*) INTO src_count FROM "Image" WHERE "profileId" IS NOT NULL;
  SELECT count(*) INTO dst_count FROM "ProfileImage";
  IF src_count <> dst_count THEN
    RAISE EXCEPTION 'Backfill mismatch: src=%, dst=%', src_count, dst_count;
  END IF;
END $$;

-- Step 5: drop the legacy profileId column from Image
ALTER TABLE "Image" DROP COLUMN "profileId";
DROP INDEX "Image_profileId_position_idx_tmp";

-- Step 6: record the Prisma migration as applied, so prisma migrate status is clean
INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid()::text,
   '<sha256-of-committed-migration.sql>',  -- computed from prisma/migrations/20260514120000_polymorphic_images/migration.sql
   now(),
   '20260514120000_polymorphic_images',
   NULL, NULL, now(), 1);

COMMIT;
```

Notes:

- The checksum is the SHA-256 of the committed `migration.sql` content. The runbook says to compute it (`sha256sum migration.sql`) and paste it in before running. If the dev migration is amended later, the prod SQL's checksum must be updated to match the final committed version.
- The transaction is all-or-nothing. If the row-count verification fails, everything rolls back.
- The verification step has access to `Image."profileId"` *because* the column hasn't been dropped yet — Steps 3, 4, and 5 are sequenced specifically so verification reads the legacy column inside the same transaction that drops it.

### Deploy runbook entry

Standard prod deploy steps from [CLAUDE.md "Production deployment"](../../CLAUDE.md), with this insert between the image pull and the `up -d` for backend:

```bash
# Pre-migration: apply the polymorphic-images schema change manually
docker compose -f docker-compose.production.yml exec db \
  psql -U $POSTGRES_USER -d $POSTGRES_DB < ~/opencupid/apps/backend/prisma/data-migrations/20260514_polymorphic_images_prod.sql

# Then resume the standard release flow
docker compose -f docker-compose.production.yml up -d --no-deps backend
# Backend container will boot, prisma migrate deploy will see the migration as applied (via _prisma_migrations row), no-op
```

## Testing

### Backend tests

- `image.service.spec.ts` — parameterized over `owner.type`. Cover: upload creates Image + correct join row in one transaction; delete removes both + files; reorder updates `position` scoped to owner gallery; position counts scope correctly; `syncProfileHasFace` only fires for profile owner.
- `image.mappers.spec.ts` and `profile.mappers.spec.ts` — fixture include-shape updated; DTO output assertions unchanged.
- New `image.route.spec.ts` cases for the generalized owner path including 403 for unauthorized owner.
- `search.service.spec.ts` — fixture include-shape updated.

### Frontend tests

- `imageStore.spec.ts` — parameterized cases for both owner types, exercising upload/list/reorder/delete.
- Existing component specs (`ProfileImage.spec.ts`, `ImageUpload.spec.ts`, `ProfileThumbnail.spec.ts`, `ProfileImageComponent.spec.ts`, `ProfilePanel.spec.ts`, `BrowseProfiles.spec.ts`, `ProfileCardComponent.spec.ts`) — fixture updates only; DTO shape preserved.

### Prod migration tests

- A rehearsal script that runs `20260514_polymorphic_images_prod.sql` against a sanitized prod snapshot, asserts row-count parity, and spot-checks `(image_id, profile_id)` pairs. Run during deploy rehearsal, not in CI.

## Affected files (approximate)

Backend:

- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/20260514120000_polymorphic_images/migration.sql` (new)
- `apps/backend/prisma/data-migrations/20260514_polymorphic_images_prod.sql` (new)
- `apps/backend/src/services/image.service.ts`
- `apps/backend/src/services/profile.service.ts`
- `apps/backend/src/services/search.service.ts`
- `apps/backend/src/api/mappers/image.mappers.ts`
- `apps/backend/src/api/mappers/profile.mappers.ts`
- `apps/backend/src/api/routes/image.route.ts`
- `apps/backend/scripts/reprocess-images.ts`
- `apps/backend/src/__tests__/...` (mappers, services, routes)

Shared Zod:

- `packages/shared/zod/profile/profileimage.dto.ts`
- `packages/shared/zod/profile/profile.form.ts`
- `packages/shared/zod/profile/profile.db.ts`
- `packages/shared/zod/profile/profile.dto.ts`
- `packages/shared/zod/generated/*` (regenerate via `prisma:generate`)
- New: `packages/shared/zod/image/image.dto.ts`, `usercontent-image.dto.ts`

Frontend:

- `apps/frontend/src/features/images/stores/imageStore.ts`
- `apps/frontend/src/features/images/__tests__/*`
- `apps/frontend/src/features/myprofile/...` (consumer of imageStore)
- `apps/frontend/src/features/posts/...` or wherever UserContent editing lives (new image gallery surface)

## Open questions for plan stage

- Whether to introduce a `UserContent`-level `hasImages` flag analogous to `Profile.hasFace`, for cheap list-view rendering. Default: no, query the join table directly until performance demands otherwise.
- Whether the `reprocess-images.ts` script needs to be owner-aware. Likely yes — read pending Images regardless of owner type, since reprocessing is asset-level work.

## Out of scope

- Attaching images to `Message`. Current `MessageAttachment` continues to handle audio voice messages unchanged. When images on messages are wanted, the design extends by adding a `MessageImage` join table; the rest of the system needs no further changes.
- Cross-owner image sharing / reference counting / orphan sweeper worker.
- Moving `position`/`altText` to join rows. Single-owner rule makes the current location correct.
