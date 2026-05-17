# Generalize Image Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared `Image` model from `ProfileImage` so both `Profile` and `UserContent` (post/event/community) can have ordered image galleries, with images owned by their uploading profile and exclusively attached to one gallery at a time.

**Architecture:** New `Image` table holds file metadata + position + altText, owned by `Profile.id`. Two thin join tables (`ProfileImage`, `UserContentImage`) link an image to exactly one gallery (PK = `imageId`). `ImageService` splits into `createImage` (file processing only) plus per-context `attachToProfile` / `attachToUserContent`; HTTP routes compose them in one Prisma transaction.

**Tech Stack:** Prisma 7 / Postgres, Fastify, Zod 4, Pinia, Vue 3 Composition API, Vitest.

**Spec:** [docs/superpowers/specs/2026-05-15-generalize-image-attachments-design.md](../specs/2026-05-15-generalize-image-attachments-design.md)

---

## Conventions used throughout this plan

- All `pnpm` commands run from repo root unless noted.
- Backend tests: `pnpm --filter backend exec vitest run -t "<name>"`. Frontend tests: `pnpm --filter frontend exec vitest run -t "<name>"`.
- After each task, commit with the message in that task's commit step. Don't squash; the small commits are intentional.
- The branch is `feat/image-attachments-design` (created off `refactor/profileimage-drop-userid`). Don't merge or push until Task 15.

---

## Task 1: Update Prisma schema

**Files:**

- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Step 1: Replace the `ProfileImage` model and add `Image` + `UserContentImage`**

Open `apps/backend/prisma/schema.prisma`. Find the existing `ProfileImage` model (it's between `LocalizedProfileField` and `Conversation`, currently lines ~255-278). Replace that entire block with:

```prisma
model Image {
  id             String  @id @default(cuid())
  ownerProfileId String
  ownerProfile   Profile @relation("OwnedImages", fields: [ownerProfileId], references: [id], onDelete: Cascade)

  storagePath String  @unique
  mimeType    String
  width       Int?
  height      Int?
  contentHash String?
  blurhash    String?
  hasFace     Boolean @default(false)
  isModerated Boolean @default(false)
  isFlagged   Boolean @default(false)

  position Int    @default(0)
  altText  String @default("")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profileGallery     ProfileImage?
  userContentGallery UserContentImage?

  @@index([ownerProfileId])
  @@index([position])
}

model ProfileImage {
  imageId   String  @id
  image     Image   @relation(fields: [imageId], references: [id], onDelete: Cascade)
  profileId String
  profile   Profile @relation("ProfileImages", fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
}

model UserContentImage {
  imageId       String      @id
  image         Image       @relation(fields: [imageId], references: [id], onDelete: Cascade)
  userContentId String
  userContent   UserContent @relation(fields: [userContentId], references: [id], onDelete: Cascade)

  @@index([userContentId])
}
```

- [ ] **Step 2: Update `Profile` model relations**

Find `Profile` (around line 171). Locate the line:

```prisma
  profileImages ProfileImage[] @relation("ProfileImages")
```

Replace with:

```prisma
  ownedImages   Image[]        @relation("OwnedImages")    // lifecycle (cascade-delete)
  profileImages ProfileImage[] @relation("ProfileImages") // gallery membership
```

- [ ] **Step 3: Update `UserContent` model relations**

Find `UserContent` (around line 392). Add this field after `community CommunityContent?`:

```prisma
  images UserContentImage[]
```

- [ ] **Step 4: Verify the schema parses**

Run from repo root:

```bash
pnpm --filter backend exec prisma format
pnpm --filter backend exec prisma validate
```

Expected: both succeed silently. If `validate` complains about a missing back-relation, re-check Steps 2-3.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma
git commit -m "feat(schema): add Image model + ProfileImage/UserContentImage join tables"
```

---

## Task 2: Write the SQL migration

**Files:**

- Create: `apps/backend/prisma/migrations/20260515120000_image_attachments_generalize/migration.sql`

- [ ] **Step 1: Create the migration directory and file**

```bash
mkdir -p apps/backend/prisma/migrations/20260515120000_image_attachments_generalize
```

- [ ] **Step 2: Write the migration SQL**

Create `apps/backend/prisma/migrations/20260515120000_image_attachments_generalize/migration.sql` with these exact contents:

```sql
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
CREATE INDEX "Image_position_idx"       ON "Image"(position);

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
```

- [ ] **Step 3: Apply migration locally**

Make sure docker-compose db is up (`docker compose up -d db`), then:

```bash
pnpm --filter backend exec prisma migrate deploy
```

Expected: `1 migration found in prisma/migrations` and `Applying migration '20260515120000_image_attachments_generalize'`.

- [ ] **Step 4: Verify the data made it across**

```bash
docker compose exec db psql -U appuser -d app -c '
  SELECT
    (SELECT COUNT(*) FROM "Image") AS images,
    (SELECT COUNT(*) FROM "ProfileImage") AS profile_joins,
    (SELECT COUNT(*) FROM "UserContentImage") AS content_joins;
'
```

Expected: `images` and `profile_joins` are equal and non-zero (assuming you have any profile images in dev DB); `content_joins` is 0.

- [ ] **Step 5: Verify Prisma agrees the DB matches the schema**

```bash
pnpm --filter backend exec prisma migrate status
```

Expected: `Database schema is up to date!`

- [ ] **Step 6: Commit**

```bash
git add apps/backend/prisma/migrations/20260515120000_image_attachments_generalize
git commit -m "feat(db): migrate ProfileImage to Image + join tables, no file moves"
```

---

## Task 3: Regenerate Prisma client and Zod schemas

**Files:**

- Modify (auto-generated): `packages/shared/zod/generated/**`
- Modify (auto-generated): `apps/backend/node_modules/.prisma/client/**` (don't commit)

- [ ] **Step 1: Regenerate Prisma client**

```bash
pnpm --filter backend exec prisma generate
```

Expected: `Generated Prisma Client (vN.N.N) to ./node_modules/@prisma/client`.

- [ ] **Step 2: Verify the generated Zod schemas reflect the new model**

The Zod generator runs as part of `prisma generate`. Check the output:

```bash
ls packages/shared/zod/generated/modelSchema/ | grep -E '^(Image|ProfileImage|UserContentImage)Schema\.ts$'
```

Expected: three filenames listed: `ImageSchema.ts`, `ProfileImageSchema.ts`, `UserContentImageSchema.ts`.

- [ ] **Step 3: Sanity-check the generated `ImageSchema`**

```bash
grep -A3 'ownerProfileId\|storagePath\|altText' packages/shared/zod/generated/modelSchema/ImageSchema.ts | head -30
```

Expected: the schema includes `ownerProfileId: z.string()`, `storagePath: z.string()`, `altText: z.string()`, etc. The presence of these confirms the regeneration succeeded.

- [ ] **Step 4: Commit the generated zod schemas**

```bash
git add packages/shared/zod/generated
git commit -m "chore(zod): regenerate schemas for Image refactor"
```

---

## Task 4: Refactor shared zod DTOs (rename ProfileImage → Image)

**Files:**

- Rename: `packages/shared/zod/profile/profileimage.dto.ts` → `packages/shared/zod/image/image.dto.ts`
- Modify: any callers that import from the old path (TypeScript will surface them in Step 5)

- [ ] **Step 1: Move the file**

```bash
mkdir -p packages/shared/zod/image
git mv packages/shared/zod/profile/profileimage.dto.ts packages/shared/zod/image/image.dto.ts
```

- [ ] **Step 2: Rewrite the DTO file with renamed types**

Replace the contents of `packages/shared/zod/image/image.dto.ts` with:

```ts
import { z } from 'zod'
import { ImageSchema } from '../generated'

export const ImageVariantSchema = z.object({
  size: z.string(),
  url: z.string().min(1),
})

export type ImageVariant = z.infer<typeof ImageVariantSchema>

// Fields exposed in the public API for any image (profile gallery or content gallery)
const publicFields = {
  mimeType: true,
  altText: true,
  position: true,
  blurhash: true,
} as const

export const PublicImageSchema = ImageSchema.pick(publicFields).extend({
  variants: z.array(ImageVariantSchema).default([]),
})
export type PublicImage = z.infer<typeof PublicImageSchema>

// Owner fields: include id so the owner UI can issue updates/deletes
const ownerFields = {
  ...publicFields,
  id: true,
} as const

export const OwnerImageSchema = ImageSchema.pick(ownerFields).extend({
  variants: z.array(ImageVariantSchema).default([]),
})
export type OwnerImage = z.infer<typeof OwnerImageSchema>

const ImagePositionSchema = z.object({
  id: z.string().cuid(),
  position: z.number().int().min(0),
})
export type ImagePosition = z.infer<typeof ImagePositionSchema>

export const ReorderImagesPayloadSchema = z.object({
  images: z.array(ImagePositionSchema).nonempty('At least one image must be provided').min(1),
})
export type ReorderImagesPayload = z.infer<typeof ReorderImagesPayloadSchema>

// API response schemas

export const ApiSuccessSchema = z.object({
  success: z.boolean(),
})

export const ImagesResponseSchema = z.object({
  images: z.array(OwnerImageSchema).default([]),
})

export const ImageApiResponseSchema = ApiSuccessSchema.merge(ImagesResponseSchema)
export type ImageApiResponse = z.infer<typeof ImageApiResponseSchema>

export type ImagesResponse = z.infer<typeof ImagesResponseSchema>
```

- [ ] **Step 3: Find all importers of the old path**

```bash
grep -rln "@zod/profile/profileimage.dto" apps packages --include='*.ts' --include='*.vue'
```

This produces the list of files that need updating in subsequent tasks. Save this list (mental or scratch); each one will get touched in Tasks 5-14.

- [ ] **Step 4: Verify the new file parses**

```bash
pnpm --filter @opencupid/shared exec tsc --noEmit
```

Expected: no errors from the new DTO file. (It's OK to see errors in _other_ files that still import from the old path — those get fixed in later tasks.)

- [ ] **Step 5: Commit**

```bash
git add packages/shared/zod/image/image.dto.ts packages/shared/zod/profile/profileimage.dto.ts
git commit -m "refactor(zod): rename profileimage.dto -> image.dto with generic types"
```

---

## Task 5: Refactor `ImageService` — split `storeImage` into `createImage` + `attachToProfile`

**Files:**

- Modify: `apps/backend/src/services/image.service.ts`
- Modify: `apps/backend/src/__tests__/services/image.service.spec.ts`

- [ ] **Step 1: Write a failing test for `createImage`**

Open `apps/backend/src/__tests__/services/image.service.spec.ts`. Find the existing `describe('storeImage', ...)` block (around line 176) and add a new sibling describe above it:

```ts
describe('createImage', () => {
  it('creates an unattached Image owned by ownerProfileId, runs face detect when requested', async () => {
    const svc = ImageService.getInstance()
    vi.spyOn(svc, 'processImage').mockResolvedValue({
      width: 100,
      height: 100,
      mime: 'image/jpeg',
      variants: { original: '/tmp/o.jpg' },
      blurhash: 'L00',
      hasFace: true,
    } as any)
    mockPrisma.image.create.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      storagePath: 'profile-1/abcd',
      mimeType: 'image/jpeg',
      hasFace: true,
      altText: 'cap',
      position: 0,
    } as any)

    const result = await svc.createImage('profile-1', '/tmp/upload.jpg', 'cap', {
      detectFace: true,
    })

    expect(result.id).toBe('img-1')
    expect(result.ownerProfileId).toBe('profile-1')
    // Critical: no ProfileImage / UserContentImage row was inserted.
    expect(mockPrisma.profileImage.create).not.toHaveBeenCalled()
    expect(mockPrisma.userContentImage.create).not.toHaveBeenCalled()
  })

  it('skips face detect when detectFace=false', async () => {
    const svc = ImageService.getInstance()
    const procSpy = vi.spyOn(svc, 'processImage').mockResolvedValue({
      width: 100,
      height: 100,
      mime: 'image/jpeg',
      variants: { original: '/tmp/o.jpg' },
      blurhash: 'L00',
      hasFace: false,
    } as any)
    mockPrisma.image.create.mockResolvedValue({ id: 'img-2', hasFace: false } as any)

    await svc.createImage('profile-1', '/tmp/u.jpg', '', { detectFace: false })

    // processImage is shared; the detect-face skip is enforced inside processImage via opts.
    expect(procSpy).toHaveBeenCalledWith(
      '/tmp/u.jpg',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ detectFace: false })
    )
  })
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

```bash
pnpm --filter backend exec vitest run -t "createImage"
```

Expected: FAIL with "svc.createImage is not a function" (or similar — the method doesn't exist yet).

- [ ] **Step 3: Implement `createImage` in `ImageService`**

Open `apps/backend/src/services/image.service.ts`. Add this method just before `storeImage` (around line 75):

```ts
/**
 * Create an Image row for a freshly uploaded file. Does NOT attach it to any gallery —
 * the caller (route handler) composes createImage + attachTo* in one transaction.
 *
 * @param opts.detectFace  When false, skips OpenCV face detection (~100ms saved).
 *                         Use true for profile uploads, false for UserContent uploads.
 */
async createImage(
  ownerProfileId: string,
  tmpImagePath: string,
  altText: string,
  opts: { detectFace: boolean }
): Promise<Image> {
  const imageLocation = await makeImageLocation(ownerProfileId)
  const processed = await this.processImage(
    tmpImagePath,
    imageLocation.absPath,
    imageLocation.base,
    { detectFace: opts.detectFace }
  )
  const contentHash = await generateContentHash(processed.variants.original)

  return prisma.image.create({
    data: {
      ownerProfileId,
      mimeType: processed.mime,
      altText,
      storagePath: path.join(imageLocation.relPath, imageLocation.base),
      contentHash,
      blurhash: processed.blurhash,
      hasFace: processed.hasFace,
      width: processed.width ?? null,
      height: processed.height ?? null,
      position: 0,
    },
  })
}
```

Update the import at the top of the file: change `import type { ProfileImage } from '@zod/generated'` → `import type { Image } from '@zod/generated'`.

- [ ] **Step 4: Make `processImage` accept the `detectFace` option**

In `image.service.ts`, change the signature of `processImage` (around line 120):

```ts
async processImage(
  filePath: string,
  outputDir: string,
  baseName: string,
  opts: { detectFace: boolean } = { detectFace: true }
) {
  // ... existing body ...
}
```

Inside `processImage`, change the line `await processor.analyze()` to:

```ts
await processor.analyze({ detectFace: opts.detectFace })
```

Open `apps/backend/src/services/imageprocessor.ts`. Find the `analyze()` method and change it to accept the option:

```ts
async analyze(opts: { detectFace: boolean } = { detectFace: true }): Promise<void> {
  // ... existing setup ...
  if (opts.detectFace) {
    // existing face-detection code
  } else {
    this.faces = []  // or whatever the empty state is
  }
}
```

(If the field is named differently in `ImageProcessor`, set it to whatever value `hasFaces()` returns false for.)

- [ ] **Step 5: Run the createImage tests**

```bash
pnpm --filter backend exec vitest run -t "createImage"
```

Expected: PASS, both cases.

- [ ] **Step 6: Write a failing test for `attachToProfile`**

In `image.service.spec.ts`, add another describe block:

```ts
describe('attachToProfile', () => {
  it('inserts the join row, sets Image.position to gallery count, syncs Profile.hasFace, in one transaction', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      profileGallery: null,
      userContentGallery: null,
    } as any)
    mockPrisma.profileImage.count.mockResolvedValue(2) // gallery already has 2 items
    mockPrisma.profileImage.create.mockResolvedValue({} as any)
    mockPrisma.image.update.mockResolvedValue({} as any)
    mockPrisma.profileImage.findFirst.mockResolvedValue({
      image: { hasFace: true },
    } as any)

    await svc.attachToProfile('img-1', 'profile-1')

    expect(mockPrisma.profileImage.create).toHaveBeenCalledWith({
      data: { imageId: 'img-1', profileId: 'profile-1' },
    })
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: { position: 2 },
    })
    // syncProfileHasFace ran inside the same transaction
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { hasFace: true },
    })
  })

  it('rejects when image is not owned by the profile', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-OTHER',
      profileGallery: null,
      userContentGallery: null,
    } as any)

    await expect(svc.attachToProfile('img-1', 'profile-1')).rejects.toThrow(/owner/i)
  })

  it('rejects when image is already attached', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      profileGallery: { profileId: 'profile-1' },
      userContentGallery: null,
    } as any)

    await expect(svc.attachToProfile('img-1', 'profile-1')).rejects.toThrow(/already attached/i)
  })
})
```

- [ ] **Step 7: Run the attachToProfile tests to confirm they fail**

```bash
pnpm --filter backend exec vitest run -t "attachToProfile"
```

Expected: FAIL with "svc.attachToProfile is not a function".

- [ ] **Step 8: Implement `attachToProfile`**

Add this to `ImageService` after `createImage`:

```ts
/**
 * Attach an existing Image to a Profile gallery. Validates ownership, computes the new
 * position, and re-syncs Profile.hasFace in one transaction.
 */
async attachToProfile(imageId: string, profileId: string): Promise<void> {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { profileGallery: true, userContentGallery: true },
  })
  if (!image) throw new Error('Image not found')
  if (image.ownerProfileId !== profileId) {
    throw new Error('Image owner mismatch')
  }
  if (image.profileGallery || image.userContentGallery) {
    throw new Error('Image already attached')
  }

  await prisma.$transaction(async (tx) => {
    const position = await tx.profileImage.count({ where: { profileId } })
    await tx.profileImage.create({ data: { imageId, profileId } })
    await tx.image.update({ where: { id: imageId }, data: { position } })
    await syncProfileHasFace(tx, profileId)
  })
}
```

- [ ] **Step 9: Update `syncProfileHasFace` to read through the join**

Open `apps/backend/src/services/profile.service.ts`. Find `syncProfileHasFace` and update the lookup:

```ts
export async function syncProfileHasFace(tx: Prisma.TransactionClient, profileId: string) {
  const top = await tx.profileImage.findFirst({
    where: { profileId },
    include: { image: { select: { hasFace: true } } },
    orderBy: { image: { position: 'asc' } },
  })
  await tx.profile.update({
    where: { id: profileId },
    data: { hasFace: top?.image.hasFace ?? false },
  })
}
```

- [ ] **Step 10: Run attachToProfile tests**

```bash
pnpm --filter backend exec vitest run -t "attachToProfile"
```

Expected: PASS, all three cases.

- [ ] **Step 11: Delete the old `storeImage` method**

In `image.service.ts`, remove the entire `storeImage` method (the one taking `profileId, tmpImagePath, captionText`). Also remove its corresponding describe block in the spec file (around line 176, the old `describe('storeImage', ...)` block) — it tests behavior that's now covered by `createImage` + `attachToProfile`.

- [ ] **Step 12: Run the full image service test file**

```bash
pnpm --filter backend exec vitest run image.service
```

Expected: all tests pass. The deletion-related tests (`describe('deleteImage', ...)`) may fail; that's fixed in Task 7.

- [ ] **Step 13: Commit**

```bash
git add apps/backend/src/services/image.service.ts apps/backend/src/services/imageprocessor.ts apps/backend/src/services/profile.service.ts apps/backend/src/__tests__/services/image.service.spec.ts
git commit -m "refactor(images): split storeImage into createImage + attachToProfile"
```

---

## Task 6: Add UserContent gallery service methods

**Files:**

- Modify: `apps/backend/src/services/image.service.ts`
- Modify: `apps/backend/src/__tests__/services/image.service.spec.ts`

- [ ] **Step 1: Write failing tests for `attachToUserContent`**

In `image.service.spec.ts`, add:

```ts
describe('attachToUserContent', () => {
  it('inserts join row + updates Image.position; does NOT touch Profile.hasFace', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      profileGallery: null,
      userContentGallery: null,
    } as any)
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: 'content-1',
      postedById: 'profile-1',
    } as any)
    mockPrisma.userContentImage.count.mockResolvedValue(0)

    await svc.attachToUserContent('img-1', 'content-1')

    expect(mockPrisma.userContentImage.create).toHaveBeenCalledWith({
      data: { imageId: 'img-1', userContentId: 'content-1' },
    })
    expect(mockPrisma.image.update).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: { position: 0 },
    })
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })

  it('rejects when content owner does not match image owner', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      profileGallery: null,
      userContentGallery: null,
    } as any)
    mockPrisma.userContent.findUnique.mockResolvedValue({
      id: 'content-1',
      postedById: 'profile-OTHER',
    } as any)

    await expect(svc.attachToUserContent('img-1', 'content-1')).rejects.toThrow(/owner/i)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter backend exec vitest run -t "attachToUserContent"
```

Expected: FAIL with "svc.attachToUserContent is not a function".

- [ ] **Step 3: Implement `attachToUserContent`**

Add to `ImageService`:

```ts
async attachToUserContent(imageId: string, userContentId: string): Promise<void> {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { profileGallery: true, userContentGallery: true },
  })
  if (!image) throw new Error('Image not found')
  if (image.profileGallery || image.userContentGallery) {
    throw new Error('Image already attached')
  }
  const content = await prisma.userContent.findUnique({ where: { id: userContentId } })
  if (!content) throw new Error('UserContent not found')
  if (content.postedById !== image.ownerProfileId) {
    throw new Error('Image owner mismatch with content author')
  }

  await prisma.$transaction(async (tx) => {
    const position = await tx.userContentImage.count({ where: { userContentId } })
    await tx.userContentImage.create({ data: { imageId, userContentId } })
    await tx.image.update({ where: { id: imageId }, data: { position } })
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter backend exec vitest run -t "attachToUserContent"
```

Expected: PASS, both cases.

- [ ] **Step 5: Write failing tests for `listProfileGallery` and `listUserContentGallery`**

```ts
describe('listProfileGallery', () => {
  it('returns Image rows ordered by position via the join', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.profileImage.findMany.mockResolvedValue([
      { image: { id: 'a', position: 0 } },
      { image: { id: 'b', position: 1 } },
    ] as any)
    const result = await svc.listProfileGallery('profile-1')
    expect(result.map((i) => i.id)).toEqual(['a', 'b'])
    expect(mockPrisma.profileImage.findMany).toHaveBeenCalledWith({
      where: { profileId: 'profile-1' },
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
    })
  })
})

describe('listUserContentGallery', () => {
  it('returns Image rows ordered by position via the join', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.userContentImage.findMany.mockResolvedValue([
      { image: { id: 'x', position: 0 } },
    ] as any)
    const result = await svc.listUserContentGallery('content-1')
    expect(result.map((i) => i.id)).toEqual(['x'])
    expect(mockPrisma.userContentImage.findMany).toHaveBeenCalledWith({
      where: { userContentId: 'content-1' },
      include: { image: true },
      orderBy: { image: { position: 'asc' } },
    })
  })
})
```

- [ ] **Step 6: Implement the list methods**

Add to `ImageService`:

```ts
async listProfileGallery(profileId: string): Promise<Image[]> {
  const rows = await prisma.profileImage.findMany({
    where: { profileId },
    include: { image: true },
    orderBy: { image: { position: 'asc' } },
  })
  return rows.map((r) => r.image)
}

async listUserContentGallery(userContentId: string): Promise<Image[]> {
  const rows = await prisma.userContentImage.findMany({
    where: { userContentId },
    include: { image: true },
    orderBy: { image: { position: 'asc' } },
  })
  return rows.map((r) => r.image)
}
```

The old `listImages(profileId)` becomes a thin alias if any callers still depend on it; otherwise delete it. Search:

```bash
grep -rn 'imageService.listImages\|svc.listImages' apps/backend/src
```

If matches exist, leave `listImages` as `return this.listProfileGallery(profileId)`; otherwise remove it.

- [ ] **Step 7: Run the list tests**

```bash
pnpm --filter backend exec vitest run -t "listProfileGallery|listUserContentGallery"
```

Expected: PASS, both.

- [ ] **Step 8: Add `reorderProfileGallery` and `reorderUserContentGallery` (replacing `reorderImages`)**

Find the existing `reorderImages` method. Rename it to `reorderProfileGallery` and update its body:

```ts
async reorderProfileGallery(profileId: string, items: ImagePosition[]): Promise<Image[]> {
  const valid = await prisma.profileImage.findMany({
    where: { profileId, imageId: { in: items.map((i) => i.id) } },
    select: { imageId: true },
  })
  const validIds = new Set(valid.map((v) => v.imageId))
  if (items.some((i) => !validIds.has(i.id))) {
    throw new Error('Invalid image ID')
  }

  return prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.image.update({ where: { id: item.id }, data: { position: item.position } })
    }
    await syncProfileHasFace(tx, profileId)
    return this.listProfileGallery(profileId)
  })
}

async reorderUserContentGallery(
  userContentId: string,
  items: ImagePosition[]
): Promise<Image[]> {
  const valid = await prisma.userContentImage.findMany({
    where: { userContentId, imageId: { in: items.map((i) => i.id) } },
    select: { imageId: true },
  })
  const validIds = new Set(valid.map((v) => v.imageId))
  if (items.some((i) => !validIds.has(i.id))) {
    throw new Error('Invalid image ID')
  }

  return prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.image.update({ where: { id: item.id }, data: { position: item.position } })
    }
    return this.listUserContentGallery(userContentId)
  })
}
```

Update the existing `describe('reorderImages', ...)` block in the spec file: rename it to `describe('reorderProfileGallery', ...)` and update the assertions to expect `tx.image.update` instead of `tx.profileImage.update`.

- [ ] **Step 9: Run reorder tests**

```bash
pnpm --filter backend exec vitest run -t "reorderProfileGallery|reorderUserContentGallery"
```

Expected: PASS.

- [ ] **Step 10: Update the import to use `ImagePosition` instead of `ProfileImagePosition`**

In `image.service.ts`, change:

```ts
import { ProfileImagePosition } from '@zod/profile/profileimage.dto'
```

to:

```ts
import type { ImagePosition } from '@zod/image/image.dto'
```

Replace all `ProfileImagePosition` references in this file with `ImagePosition`.

- [ ] **Step 11: Commit**

```bash
git add apps/backend/src/services/image.service.ts apps/backend/src/__tests__/services/image.service.spec.ts
git commit -m "feat(images): add UserContent gallery service methods"
```

---

## Task 7: Update `deleteImage` to detect which join exists

**Files:**

- Modify: `apps/backend/src/services/image.service.ts`
- Modify: `apps/backend/src/__tests__/services/image.service.spec.ts`

- [ ] **Step 1: Update the existing `deleteImage` tests for the new shape**

Open `image.service.spec.ts`. Find the `describe('deleteImage', ...)` block (around line 53). Replace it with:

```ts
describe('deleteImage', () => {
  it('deletes a profile-gallery image: drops join, drops Image, syncs hasFace, unlinks files', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      storagePath: 'profile-1/abcd',
      profileGallery: { profileId: 'profile-1' },
      userContentGallery: null,
    } as any)
    mockPrisma.profileImage.findFirst.mockResolvedValue({
      image: { hasFace: true },
    } as any)

    await svc.deleteImage('img-1', 'profile-1')

    expect(mockPrisma.profileImage.delete).toHaveBeenCalledWith({ where: { imageId: 'img-1' } })
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } })
    expect(mockPrisma.profile.update).toHaveBeenCalledWith({
      where: { id: 'profile-1' },
      data: { hasFace: true },
    })
  })

  it('deletes a usercontent-gallery image: drops join + Image, does NOT touch Profile.hasFace', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-2',
      ownerProfileId: 'profile-1',
      storagePath: 'profile-1/efgh',
      profileGallery: null,
      userContentGallery: { userContentId: 'content-1' },
    } as any)

    await svc.deleteImage('img-2', 'profile-1')

    expect(mockPrisma.userContentImage.delete).toHaveBeenCalledWith({ where: { imageId: 'img-2' } })
    expect(mockPrisma.image.delete).toHaveBeenCalledWith({ where: { id: 'img-2' } })
    expect(mockPrisma.profile.update).not.toHaveBeenCalled()
  })

  it('rejects when requester is not the image owner', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-3',
      ownerProfileId: 'profile-OTHER',
      profileGallery: null,
      userContentGallery: null,
    } as any)

    await expect(svc.deleteImage('img-3', 'profile-1')).rejects.toThrow(/owner/i)
  })
})
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
pnpm --filter backend exec vitest run -t "deleteImage"
```

Expected: FAIL — the existing `deleteImage(profileId, imageId)` signature doesn't match.

- [ ] **Step 3: Rewrite `deleteImage`**

Replace the existing `deleteImage` method in `image.service.ts` with:

```ts
async deleteImage(imageId: string, requesterProfileId: string): Promise<void> {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { profileGallery: true, userContentGallery: true },
  })
  if (!image) throw new Error('Image not found')
  if (image.ownerProfileId !== requesterProfileId) {
    throw new Error('Image owner mismatch')
  }

  await prisma.$transaction(async (tx) => {
    if (image.profileGallery) {
      await tx.profileImage.delete({ where: { imageId } })
    } else if (image.userContentGallery) {
      await tx.userContentImage.delete({ where: { imageId } })
    }
    await tx.image.delete({ where: { id: imageId } })
    if (image.profileGallery) {
      await syncProfileHasFace(tx, image.profileGallery.profileId)
    }
  })

  // File cleanup, post-commit, best-effort (matches prior behavior).
  const baseFile = path.join(getMediaRoot(), imageBasePath(image.storagePath))
  const filesToDelete = [
    `${baseFile}-original.jpg`,
    `${baseFile}-face.jpg`,
    ...variants.map((size) => `${baseFile}-${size.name}.webp`),
  ]
  for (const f of filesToDelete) {
    try {
      await fs.promises.unlink(f)
    } catch (err) {
      console.warn('Error deleting file:', err)
    }
  }
}
```

- [ ] **Step 4: Run deleteImage tests**

```bash
pnpm --filter backend exec vitest run -t "deleteImage"
```

Expected: PASS, all three cases.

- [ ] **Step 5: Add `updateImage(imageId, requesterProfileId, patch)` (replacing the old signature)**

Find the existing `updateImage(image: ProfileImage)` method. Replace with:

```ts
async updateImage(
  imageId: string,
  requesterProfileId: string,
  patch: { altText?: string }
): Promise<Image> {
  const image = await prisma.image.findUnique({ where: { id: imageId } })
  if (!image) throw new Error('Image not found')
  if (image.ownerProfileId !== requesterProfileId) {
    throw new Error('Image owner mismatch')
  }
  return prisma.image.update({
    where: { id: imageId },
    data: { altText: patch.altText ?? image.altText },
  })
}
```

- [ ] **Step 6: Add a quick test for updateImage**

```ts
describe('updateImage', () => {
  it('patches altText for the owner', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-1',
      altText: 'old',
    } as any)
    mockPrisma.image.update.mockResolvedValue({ id: 'img-1', altText: 'new' } as any)

    const result = await svc.updateImage('img-1', 'profile-1', { altText: 'new' })
    expect(result.altText).toBe('new')
  })

  it('rejects non-owner', async () => {
    const svc = ImageService.getInstance()
    mockPrisma.image.findUnique.mockResolvedValue({
      id: 'img-1',
      ownerProfileId: 'profile-OTHER',
    } as any)

    await expect(svc.updateImage('img-1', 'profile-1', { altText: 'x' })).rejects.toThrow(/owner/i)
  })
})
```

- [ ] **Step 7: Run the full image service tests**

```bash
pnpm --filter backend exec vitest run image.service
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/services/image.service.ts apps/backend/src/__tests__/services/image.service.spec.ts
git commit -m "refactor(images): deleteImage detects which gallery; updateImage owner-checks"
```

---

## Task 8: Update backend mappers

**Files:**

- Rename: `apps/backend/src/api/mappers/image.mappers.ts` (already exists, just rewrite contents)
- Modify: `apps/backend/src/api/mappers/profile.mappers.ts`
- Search-and-update: any other mapper that imports from the old DTO path

- [ ] **Step 1: Rewrite `image.mappers.ts`**

Replace contents of `apps/backend/src/api/mappers/image.mappers.ts` with:

```ts
import { Image } from '@prisma/client'
import { ImageService } from '@/services/image.service'
import { PublicImage, PublicImageSchema, OwnerImage, OwnerImageSchema } from '@zod/image/image.dto'

export interface MinimalImage {
  storagePath: string
}

function getImageVariants(image: MinimalImage) {
  const svc = ImageService.getInstance()
  return svc.getImageUrls(image)
}

export function toPublicImage(image: MinimalImage): PublicImage {
  const variants = getImageVariants(image)
  return PublicImageSchema.parse({ ...image, variants })
}

export function toOwnerImage(image: Image): OwnerImage {
  const variants = getImageVariants(image)
  return OwnerImageSchema.parse({ ...image, variants })
}
```

- [ ] **Step 2: Update `profile.mappers.ts`**

Open `apps/backend/src/api/mappers/profile.mappers.ts`. Update imports:

```ts
import { type OwnerImage, type PublicImage } from '@zod/image/image.dto'
import { Image } from '@zod/generated'
import { toOwnerImage, toPublicImage, type MinimalImage } from './image.mappers'
```

Find and replace these function definitions:

```ts
export function mapProfileImagesToOwner(images: Image[]): OwnerImage[] {
  return images.map((img) => toOwnerImage(img))
}

export function mapProfileImagesToPublic(images: Image[]): PublicImage[] {
  return images.map((img: Image) => toPublicImage(img))
}
```

The signatures stay the same name (since callers use these names), but the parameter type and return type now refer to the generic `Image`/`OwnerImage`/`PublicImage`.

- [ ] **Step 3: Find and fix the `db.profileImages` reads**

Inside `profile.mappers.ts`, find `db.profileImages` references (Steps in `mapDbProfileToOwnerProfile`, `mapProfileSummary`, etc.). The Prisma include now returns `profileImages: Array<{ image: Image, ... }>`. Update each:

```ts
// Before:
const images = db.profileImages ? mapProfileImagesToOwner(db.profileImages) : []

// After:
const images = db.profileImages ? mapProfileImagesToOwner(db.profileImages.map((g) => g.image)) : []
```

Apply the same shape to every read: `dbProfile.profileImages.map(g => g.image)` becomes the input to the mappers.

- [ ] **Step 4: Update Prisma includes for `Profile` queries**

Search for `profileImages: true` in include clauses:

```bash
grep -rn 'profileImages: true\|profileImages:' apps/backend/src --include='*.ts' | grep -v __tests__
```

For every match, change to:

```ts
profileImages: {
  include: {
    image: true
  }
}
```

(The relation field name on `Profile` is now `profileImages` per Task 1, Step 2.)

- [ ] **Step 5: Update the type alias `DbProfileWithImages`**

This type is defined somewhere in `apps/backend/src/services/profile.service.ts` or similar. Search:

```bash
grep -rn 'DbProfileWithImages' apps/backend/src
```

Update the type to include the new shape:

```ts
export type DbProfileWithImages = Prisma.ProfileGetPayload<{
  include: { profileImages: { include: { image: true } } /* ...other existing includes */ }
}>
```

- [ ] **Step 6: Type-check the backend**

```bash
pnpm --filter backend exec tsc --noEmit
```

Expected: any remaining errors should be in route files (Task 9-10) or test fixtures, not in mappers/services.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/api/mappers apps/backend/src/services/profile.service.ts
git commit -m "refactor(mappers): generalize ProfileImage mappers to Image"
```

---

## Task 9: Update existing `/image/*` routes

**Files:**

- Modify: `apps/backend/src/api/routes/image.route.ts`

- [ ] **Step 1: Rewrite the route file**

Replace the contents of `apps/backend/src/api/routes/image.route.ts` with:

```ts
import { z } from 'zod'
import { FastifyPluginAsync } from 'fastify'
import multipart, { MultipartValue } from '@fastify/multipart'

import { ImageService } from '@/services/image.service'
import { uploadTmpDir } from '@/lib/media'
import { prisma } from '@/lib/prisma'
import { rateLimitConfig, sendError } from '../helpers'
import { mapProfileImagesToOwner } from '@/api/mappers/profile.mappers'
import { ReorderImagesPayloadSchema } from '@zod/image/image.dto'
import { appConfig } from '@/lib/appconfig'
import type { ImageApiResponse } from '@zod/image/image.dto'

const IdLookupParamsSchema = z.object({ id: z.string().cuid() })
const UpdateImageBodySchema = z.object({ altText: z.string().optional() })

const imageRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: appConfig.IMAGE_MAX_SIZE,
      files: 1,
      headerPairs: 2000,
      parts: 1000,
    },
    attachFieldsToBody: false,
  })

  const imageService = ImageService.getInstance()

  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    try {
      const images = await imageService.listProfileGallery(req.session.profileId)
      const response: ImageApiResponse = {
        success: true,
        images: mapProfileImagesToOwner(images),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch user images')
    }
  })

  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 10),
    },
    async (req, reply) => {
      let files
      try {
        files = await req.saveRequestFiles({
          tmpdir: uploadTmpDir(),
          limits: { fileSize: appConfig.IMAGE_MAX_SIZE, files: 1, fields: 1 },
        })
      } catch (err: any) {
        fastify.log.warn('Upload error:', err, err.code)
        const reason =
          err.code === 'FST_REQ_FILE_TOO_LARGE' ? 'IMAGE_TOO_LARGE' : 'IMAGE_UPLOAD_FAILED'
        return sendError(reply, 400, reason)
      }

      if (files.length === 0) return sendError(reply, 400, 'No file uploaded')
      const fileUpload = files[0]
      if (!fileUpload.mimetype.startsWith('image/')) {
        return sendError(reply, 400, 'Uploaded file must be an image')
      }

      const captionText = ((
        (Array.isArray(fileUpload.fields.captionText)
          ? fileUpload.fields.captionText[0]
          : fileUpload.fields.captionText) as MultipartValue
      ).value ?? '') as string

      let createdId: string | null = null
      try {
        // createImage writes the Image row + processes files. attachToProfile is a separate
        // small transaction. We can't wrap both in one $transaction because createImage holds
        // the connection across ~200ms of file processing — bad for the pool. Instead, on
        // attach failure we compensate by deleting the orphan Image row.
        const created = await imageService.createImage(
          req.session.profileId,
          fileUpload.filepath,
          captionText,
          { detectFace: true }
        )
        createdId = created.id
        await imageService.attachToProfile(created.id, req.session.profileId)

        const updated = await imageService.listProfileGallery(req.session.profileId)
        const response: ImageApiResponse = {
          success: true,
          images: mapProfileImagesToOwner(updated),
        }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error({ err }, 'Error storing image')
        if (createdId) {
          // Compensate: delete the orphan Image (no join exists, so deleteImage's
          // gallery-detection path is a no-op aside from removing the row + files).
          try {
            await imageService.deleteImage(createdId, req.session.profileId)
          } catch (cleanupErr) {
            fastify.log.error(
              { err: cleanupErr, imageId: createdId },
              'Failed to clean up orphan image'
            )
          }
        }
        return sendError(reply, 500, 'Failed to store image')
      }
    }
  )

  fastify.delete('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id: imageId } = IdLookupParamsSchema.parse(req.params)
    try {
      await imageService.deleteImage(imageId, req.session.profileId)
      const updated = await imageService.listProfileGallery(req.session.profileId)
      const response: ImageApiResponse = {
        success: true,
        images: mapProfileImagesToOwner(updated),
      }
      return reply.code(200).send(response)
    } catch (err: any) {
      fastify.log.error(err)
      if (/owner/i.test(err.message)) return sendError(reply, 403, 'Forbidden')
      return sendError(reply, 500, 'Failed to delete image')
    }
  })

  fastify.patch('/:id', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { id: imageId } = IdLookupParamsSchema.parse(req.params)
    const patch = UpdateImageBodySchema.parse(req.body)
    try {
      await imageService.updateImage(imageId, req.session.profileId, patch)
      const updated = await imageService.listProfileGallery(req.session.profileId)
      const response: ImageApiResponse = {
        success: true,
        images: mapProfileImagesToOwner(updated),
      }
      return reply.code(200).send(response)
    } catch (err: any) {
      fastify.log.error(err)
      if (/owner/i.test(err.message)) return sendError(reply, 403, 'Forbidden')
      return sendError(reply, 500, 'Failed to update image')
    }
  })

  fastify.patch('/order', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { images } = ReorderImagesPayloadSchema.parse(req.body)
    try {
      const updated = await imageService.reorderProfileGallery(req.session.profileId, images)
      const response: ImageApiResponse = {
        success: true,
        images: mapProfileImagesToOwner(updated),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return reply.code(500).send({ success: false })
    }
  })
}

export default imageRoutes
```

- [ ] **Step 2: Type-check the route file**

```bash
pnpm --filter backend exec tsc --noEmit
```

Expected: no errors in `image.route.ts`. Errors elsewhere (e.g. content routes) are addressed in Task 10.

- [ ] **Step 3: Run integration tests for the image route if any exist**

```bash
ls apps/backend/src/__tests__/api/routes/ | grep -i image
```

If a test file exists, run it. If not, skip — service-layer tests cover the behavior.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/api/routes/image.route.ts
git commit -m "refactor(routes): wire /image to createImage + attachToProfile composition"
```

---

## Task 10: Add `/content/:contentId/image/*` routes for UserContent gallery

**Files:**

- Create: `apps/backend/src/api/routes/content/image.route.ts`
- Modify: `apps/backend/src/api/index.ts`

- [ ] **Step 1: Create the new route file**

Create `apps/backend/src/api/routes/content/image.route.ts` with:

```ts
import { z } from 'zod'
import { FastifyPluginAsync } from 'fastify'
import multipart, { MultipartValue } from '@fastify/multipart'

import { ImageService } from '@/services/image.service'
import { prisma } from '@/lib/prisma'
import { uploadTmpDir } from '@/lib/media'
import { rateLimitConfig, sendError } from '../../helpers'
import { ReorderImagesPayloadSchema } from '@zod/image/image.dto'
import { OwnerImageSchema } from '@zod/image/image.dto'
import { appConfig } from '@/lib/appconfig'
import type { ImageApiResponse } from '@zod/image/image.dto'
import { toOwnerImage } from '@/api/mappers/image.mappers'

const ContentParamsSchema = z.object({ contentId: z.string().cuid() })

const contentImageRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fields: 10,
      fileSize: appConfig.IMAGE_MAX_SIZE,
      files: 1,
      headerPairs: 2000,
      parts: 1000,
    },
    attachFieldsToBody: false,
  })

  const imageService = ImageService.getInstance()

  // GET /content/:contentId/image — owner view of the gallery
  fastify.get('/:contentId/image', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { contentId } = ContentParamsSchema.parse(req.params)
    try {
      // Authz: caller must own the content.
      const content = await prisma.userContent.findUnique({ where: { id: contentId } })
      if (!content) return sendError(reply, 404, 'Content not found')
      if (content.postedById !== req.session.profileId) {
        return sendError(reply, 403, 'Forbidden')
      }
      const images = await imageService.listUserContentGallery(contentId)
      const response: ImageApiResponse = {
        success: true,
        images: images.map(toOwnerImage),
      }
      return reply.code(200).send(response)
    } catch (err) {
      fastify.log.error(err)
      return sendError(reply, 500, 'Failed to fetch content images')
    }
  })

  // POST /content/:contentId/image — upload + attach
  fastify.post(
    '/:contentId/image',
    {
      onRequest: [fastify.authenticate],
      config: rateLimitConfig(fastify, '1 minute', 10),
    },
    async (req, reply) => {
      const { contentId } = ContentParamsSchema.parse(req.params)
      const content = await prisma.userContent.findUnique({ where: { id: contentId } })
      if (!content) return sendError(reply, 404, 'Content not found')
      if (content.postedById !== req.session.profileId) {
        return sendError(reply, 403, 'Forbidden')
      }

      let files
      try {
        files = await req.saveRequestFiles({
          tmpdir: uploadTmpDir(),
          limits: { fileSize: appConfig.IMAGE_MAX_SIZE, files: 1, fields: 1 },
        })
      } catch (err: any) {
        fastify.log.warn('Upload error:', err, err.code)
        const reason =
          err.code === 'FST_REQ_FILE_TOO_LARGE' ? 'IMAGE_TOO_LARGE' : 'IMAGE_UPLOAD_FAILED'
        return sendError(reply, 400, reason)
      }

      if (files.length === 0) return sendError(reply, 400, 'No file uploaded')
      const fileUpload = files[0]
      if (!fileUpload.mimetype.startsWith('image/')) {
        return sendError(reply, 400, 'Uploaded file must be an image')
      }

      const captionText = ((
        (Array.isArray(fileUpload.fields.captionText)
          ? fileUpload.fields.captionText[0]
          : fileUpload.fields.captionText) as MultipartValue
      ).value ?? '') as string

      let createdId: string | null = null
      try {
        const created = await imageService.createImage(
          req.session.profileId,
          fileUpload.filepath,
          captionText,
          { detectFace: false }
        )
        createdId = created.id
        await imageService.attachToUserContent(created.id, contentId)
        const updated = await imageService.listUserContentGallery(contentId)
        const response: ImageApiResponse = {
          success: true,
          images: updated.map(toOwnerImage),
        }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error({ err }, 'Error storing content image')
        if (createdId) {
          try {
            await imageService.deleteImage(createdId, req.session.profileId)
          } catch (cleanupErr) {
            fastify.log.error(
              { err: cleanupErr, imageId: createdId },
              'Failed to clean up orphan image'
            )
          }
        }
        return sendError(reply, 500, 'Failed to store image')
      }
    }
  )

  // PATCH /content/:contentId/image/order
  fastify.patch(
    '/:contentId/image/order',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const { contentId } = ContentParamsSchema.parse(req.params)
      const content = await prisma.userContent.findUnique({ where: { id: contentId } })
      if (!content) return sendError(reply, 404, 'Content not found')
      if (content.postedById !== req.session.profileId) {
        return sendError(reply, 403, 'Forbidden')
      }
      const { images } = ReorderImagesPayloadSchema.parse(req.body)
      try {
        const updated = await imageService.reorderUserContentGallery(contentId, images)
        const response: ImageApiResponse = {
          success: true,
          images: updated.map(toOwnerImage),
        }
        return reply.code(200).send(response)
      } catch (err) {
        fastify.log.error(err)
        return reply.code(500).send({ success: false })
      }
    }
  )
}

export default contentImageRoutes
```

Note: DELETE and PATCH altText for content images go through `/api/image/:id` (the unified endpoint from Task 9), since the service layer detects context via `image.userContentGallery`.

- [ ] **Step 2: Register the route**

Open `apps/backend/src/api/index.ts`. After the line:

```ts
fastify.register(communityRoutes, { prefix: '/content/communities' })
```

Add:

```ts
import contentImageRoutes from './routes/content/image.route'
// ... near the other imports ...

fastify.register(contentImageRoutes, { prefix: '/content' })
```

(The route handlers in `image.route.ts` use `:contentId/image`, so the final paths become `/api/content/:contentId/image`.)

- [ ] **Step 3: Type-check**

```bash
pnpm --filter backend exec tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Smoke-test by starting the dev server**

In one shell:

```bash
pnpm dev
```

In another:

```bash
curl -k -X GET https://localhost:3000/api/health || true
```

Expected: server starts without errors. (Routes will require auth so we can't easily curl them; the start-without-error is the verification.)

Stop the dev server (Ctrl-C in shell 1).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/routes/content/image.route.ts apps/backend/src/api/index.ts
git commit -m "feat(routes): add /content/:contentId/image gallery endpoints"
```

---

## Task 11: Frontend — rename `imageStore` → `profileImageStore` and define `GalleryStore` interface

**Files:**

- Rename: `apps/frontend/src/features/images/stores/imageStore.ts` → `apps/frontend/src/features/images/stores/profileImageStore.ts`
- Create: `apps/frontend/src/features/images/stores/galleryStore.ts` (the shared interface)
- Modify: any importer (TypeScript will surface them)

- [ ] **Step 1: Create the shared `GalleryStore` interface**

Create `apps/frontend/src/features/images/stores/galleryStore.ts`:

```ts
import type { Ref } from 'vue'
import type { OwnerImage, ImagePosition } from '@zod/image/image.dto'
import type { ApiSuccess, ApiError } from '@zod/apiResponse.dto'

export type GalleryStoreResponse = ApiSuccess<{}> | ApiError

export interface GalleryStore {
  images: OwnerImage[]
  isLoading: boolean
  load(): Promise<GalleryStoreResponse>
  upload(file: File, captionText: string): Promise<GalleryStoreResponse>
  remove(image: OwnerImage): Promise<GalleryStoreResponse>
  reorder(items: ImagePosition[]): Promise<GalleryStoreResponse>
}
```

- [ ] **Step 2: Rename and rewrite the profile store**

```bash
git mv apps/frontend/src/features/images/stores/imageStore.ts apps/frontend/src/features/images/stores/profileImageStore.ts
```

Replace the contents of `profileImageStore.ts` with:

```ts
import z from 'zod'
import { defineStore } from 'pinia'
import { api, axios, safeApiCall } from '@/lib/api'
import type { ApiError } from '@zod/apiResponse.dto'
import {
  type ImageApiResponse,
  ImageApiResponseSchema,
  type OwnerImage,
  type ImagePosition,
} from '@zod/image/image.dto'
import { bus } from '@/lib/bus'
import type { GalleryStore, GalleryStoreResponse } from './galleryStore'

export const useProfileImageStore = defineStore('profileImage', {
  state: () => ({
    images: [] as OwnerImage[],
    isLoading: false,
  }),

  actions: {
    async upload(file: File, captionText: string): Promise<GalleryStoreResponse> {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('captionText', captionText)
      try {
        this.isLoading = true
        const { data } = await safeApiCall(() => api.post<ImageApiResponse>('/image', formData))
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (err: unknown) {
        return mapStoreError(err)
      } finally {
        this.isLoading = false
      }
    },

    async remove(image: OwnerImage): Promise<GalleryStoreResponse> {
      try {
        this.isLoading = true
        const { data } = await safeApiCall(() => api.delete<ImageApiResponse>(`/image/${image.id}`))
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (err) {
        return { success: false, message: 'An unexpected error occurred' }
      } finally {
        this.isLoading = false
      }
    },

    async reorder(items: ImagePosition[]): Promise<GalleryStoreResponse> {
      try {
        this.isLoading = true
        const { data } = await safeApiCall(() =>
          api.patch<ImageApiResponse>('/image/order', { images: items })
        )
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch {
        this.images = []
        return { success: false, message: 'An unexpected error occurred' }
      } finally {
        this.isLoading = false
      }
    },

    async load(): Promise<GalleryStoreResponse> {
      try {
        this.isLoading = true
        const { data } = await safeApiCall(() => api.get<ImageApiResponse>('/image/me'))
        const { images } = ImageApiResponseSchema.parse(data)
        this.images = images
        return { success: true }
      } catch (err: any) {
        console.error('Failed to fetch profile images:', err)
        this.images = []
        return {
          success: false,
          message: err.response?.data?.message || 'Failed to fetch profile images',
        }
      } finally {
        this.isLoading = false
      }
    },

    teardown() {
      this.images = []
    },
  },
})
// The returned store instance satisfies the GalleryStore interface structurally
// (load/upload/remove/reorder + images/isLoading). No explicit cast needed; consumers
// that type a binding as GalleryStore will get a compile-time check.

function mapStoreError(err: unknown): GalleryStoreResponse {
  const out: ApiError = { success: false, message: 'An unexpected error occurred' }
  if (err instanceof z.ZodError) {
    // shape preserved for parity with prior implementation
  }
  if (axios.isAxiosError(err) && err.response) {
    const resp = err.response.data as Partial<ApiError>
    out.message = resp.message ?? out.message
    if (resp.fieldErrors) out.fieldErrors = resp.fieldErrors
  } else if (err instanceof Error) {
    out.message = err.message
  }
  return out
}

bus.on('auth:logout', () => {
  useProfileImageStore().teardown()
})
```

- [ ] **Step 3: Find and update all importers**

```bash
grep -rln "useImageStore\|features/images/stores/imageStore" apps/frontend/src --include='*.ts' --include='*.vue'
```

For each match, change:

- `import { useImageStore } from '@/features/images/stores/imageStore'` → `import { useProfileImageStore } from '@/features/images/stores/profileImageStore'`
- `useImageStore()` → `useProfileImageStore()`
- `imageStore.uploadProfileImage(...)` → `imageStore.upload(...)`
- `imageStore.fetchImages()` → `imageStore.load()`
- `imageStore.deleteImage(...)` → `imageStore.remove(...)`
- `imageStore.reorderImages(...)` → `imageStore.reorder(...)`

- [ ] **Step 4: Update test fixtures**

```bash
grep -rln "useImageStore\|ProfileImage\|profileimage.dto" apps/frontend/src/features/images/__tests__
```

Update imports in each test file the same way. The component tests for `ProfileImage.vue` will be renamed in Task 14.

- [ ] **Step 5: Frontend type-check**

```bash
pnpm --filter frontend exec vue-tsc --noEmit
```

Expected: errors only in files touched by Tasks 12-14 (`ImageEditor.vue`, `ProfileImage.vue`, etc., which haven't been refactored yet). Note any new error categories.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/images/stores apps/frontend/src/features
git commit -m "refactor(frontend): rename imageStore -> profileImageStore, add GalleryStore interface"
```

---

## Task 12: Frontend — add `userContentImageStore`

**Files:**

- Create: `apps/frontend/src/features/images/stores/userContentImageStore.ts`
- Create: `apps/frontend/src/features/images/__tests__/userContentImageStore.spec.ts`

- [ ] **Step 1: Write a failing store test**

Create `apps/frontend/src/features/images/__tests__/userContentImageStore.spec.ts`:

```ts
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '@/lib/api'
import { useUserContentImageStore } from '../stores/userContentImageStore'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
  axios: { isAxiosError: vi.fn(() => false) },
  safeApiCall: vi.fn((fn) => fn()),
}))

describe('useUserContentImageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('load() GETs /content/:id/image and stores the result', async () => {
    ;(api.get as any).mockResolvedValue({
      data: {
        success: true,
        images: [
          {
            id: 'i1',
            mimeType: 'image/jpeg',
            altText: '',
            position: 0,
            blurhash: 'L0',
            variants: [{ size: 'original', url: '/x' }],
          },
        ],
      },
    })
    const store = useUserContentImageStore('content-1')
    const res = await store.load()
    expect(res.success).toBe(true)
    expect(api.get).toHaveBeenCalledWith('/content/content-1/image')
    expect(store.images).toHaveLength(1)
  })

  it('upload() POSTs to /content/:id/image with multipart payload', async () => {
    ;(api.post as any).mockResolvedValue({
      data: { success: true, images: [] },
    })
    const store = useUserContentImageStore('content-1')
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    await store.upload(file, 'cap')
    expect(api.post).toHaveBeenCalledWith('/content/content-1/image', expect.any(FormData))
  })

  it('reorder() PATCHes /content/:id/image/order', async () => {
    ;(api.patch as any).mockResolvedValue({ data: { success: true, images: [] } })
    const store = useUserContentImageStore('content-1')
    await store.reorder([{ id: 'i1', position: 0 }])
    expect(api.patch).toHaveBeenCalledWith('/content/content-1/image/order', {
      images: [{ id: 'i1', position: 0 }],
    })
  })

  it('remove() DELETEs /image/:id (unified endpoint)', async () => {
    ;(api.delete as any).mockResolvedValue({ data: { success: true, images: [] } })
    const store = useUserContentImageStore('content-1')
    await store.remove({ id: 'i1' } as any)
    expect(api.delete).toHaveBeenCalledWith('/image/i1')
  })
})
```

- [ ] **Step 2: Run the failing tests**

```bash
pnpm --filter frontend exec vitest run -t "useUserContentImageStore"
```

Expected: FAIL with "Cannot find module '../stores/userContentImageStore'".

- [ ] **Step 3: Implement the store**

Create `apps/frontend/src/features/images/stores/userContentImageStore.ts`:

```ts
import { defineStore } from 'pinia'
import { api, axios, safeApiCall } from '@/lib/api'
import type { ApiError } from '@zod/apiResponse.dto'
import {
  type ImageApiResponse,
  ImageApiResponseSchema,
  type OwnerImage,
  type ImagePosition,
} from '@zod/image/image.dto'
import type { GalleryStoreResponse } from './galleryStore'

/**
 * Per-content store factory. Each UserContent gallery gets its own store instance keyed
 * by contentId; multiple instances may coexist (one per editor mount).
 */
export const useUserContentImageStore = (contentId: string) =>
  defineStore(`userContentImage:${contentId}`, {
    state: () => ({
      images: [] as OwnerImage[],
      isLoading: false,
    }),
    actions: {
      async load(): Promise<GalleryStoreResponse> {
        try {
          this.isLoading = true
          const { data } = await safeApiCall(() =>
            api.get<ImageApiResponse>(`/content/${contentId}/image`)
          )
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return { success: true }
        } catch (err: any) {
          this.images = []
          return {
            success: false,
            message: err.response?.data?.message || 'Failed to fetch images',
          }
        } finally {
          this.isLoading = false
        }
      },

      async upload(file: File, captionText: string): Promise<GalleryStoreResponse> {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('captionText', captionText)
        try {
          this.isLoading = true
          const { data } = await safeApiCall(() =>
            api.post<ImageApiResponse>(`/content/${contentId}/image`, formData)
          )
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return { success: true }
        } catch (err: unknown) {
          const out: ApiError = { success: false, message: 'An unexpected error occurred' }
          if (axios.isAxiosError(err) && err.response) {
            const resp = err.response.data as Partial<ApiError>
            out.message = resp.message ?? out.message
            if (resp.fieldErrors) out.fieldErrors = resp.fieldErrors
          } else if (err instanceof Error) {
            out.message = err.message
          }
          return out
        } finally {
          this.isLoading = false
        }
      },

      async remove(image: OwnerImage): Promise<GalleryStoreResponse> {
        // DELETE goes through the unified /image/:id endpoint.
        try {
          this.isLoading = true
          await safeApiCall(() => api.delete<ImageApiResponse>(`/image/${image.id}`))
          // Re-fetch to refresh local state (delete response is for the profile gallery).
          return await this.load()
        } catch {
          return { success: false, message: 'Failed to delete image' }
        } finally {
          this.isLoading = false
        }
      },

      async reorder(items: ImagePosition[]): Promise<GalleryStoreResponse> {
        try {
          this.isLoading = true
          const { data } = await safeApiCall(() =>
            api.patch<ImageApiResponse>(`/content/${contentId}/image/order`, { images: items })
          )
          const { images } = ImageApiResponseSchema.parse(data)
          this.images = images
          return { success: true }
        } catch {
          return { success: false, message: 'Failed to reorder' }
        } finally {
          this.isLoading = false
        }
      },
    },
  })()
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter frontend exec vitest run -t "useUserContentImageStore"
```

Expected: PASS, all four cases.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/images/stores/userContentImageStore.ts apps/frontend/src/features/images/__tests__/userContentImageStore.spec.ts
git commit -m "feat(frontend): add useUserContentImageStore for content galleries"
```

---

## Task 13: Frontend — refactor `ImageEditor.vue` to take a `store` prop

**Files:**

- Modify: `apps/frontend/src/features/images/components/ImageEditor.vue`
- Modify: `apps/frontend/src/features/myprofile/**` (whichever component mounts `<ImageEditor />`)

- [ ] **Step 1: Read the current `ImageEditor.vue`**

Skim the file to understand which store methods are called. From earlier grep: `imageStore.images`, `deleteImage`, `reorderImages`, `fetchImages`, and the upload child component.

- [ ] **Step 2: Update `ImageEditor.vue` to accept a store prop**

Open `apps/frontend/src/features/images/components/ImageEditor.vue`. In the `<script setup>` block, replace the imageStore import and instantiation:

```ts
// Before:
import { useImageStore } from '@/features/images/stores/imageStore'
const imageStore = useImageStore()

// After:
import type { GalleryStore } from '@/features/images/stores/galleryStore'
import type { OwnerImage } from '@zod/image/image.dto'

const props = defineProps<{ store: GalleryStore }>()
const imageStore = props.store
```

The rest of the template/script — the references to `imageStore.images`, `imageStore.remove(...)`, `imageStore.reorder(...)`, `imageStore.load()` — all stay the same (since the GalleryStore interface declares those exact method names).

Also rename callsites within the file:

- `imageStore.deleteImage(image)` → `imageStore.remove(image)`
- `imageStore.reorderImages(newOrder)` → `imageStore.reorder(newOrder)`
- `imageStore.fetchImages()` → `imageStore.load()`
- Type `OwnerProfileImage` → `OwnerImage`

- [ ] **Step 3: Update the myprofile mount**

```bash
grep -rln 'ImageEditor' apps/frontend/src/features/myprofile
```

For each match, update the `<ImageEditor>` mount to pass the store:

```vue
<!-- Before -->
<ImageEditor />

<!-- After -->
<ImageEditor :store="useProfileImageStore()" />
```

Make sure `useProfileImageStore` is imported in that file:

```ts
import { useProfileImageStore } from '@/features/images/stores/profileImageStore'
```

- [ ] **Step 4: Update existing tests for ImageEditor**

Open `apps/frontend/src/features/images/__tests__/` and find the test file mounting `ImageEditor` (likely `ImageEditor.spec.ts` or similar). Update the test to inject a store via the prop:

```ts
// Inside the test setup, replace any pinia/imageStore manipulation with a stub store object that satisfies GalleryStore.
const stubStore: GalleryStore = {
  images: [
    /* fixture */
  ],
  isLoading: false,
  load: vi.fn().mockResolvedValue({ success: true }),
  upload: vi.fn().mockResolvedValue({ success: true }),
  remove: vi.fn().mockResolvedValue({ success: true }),
  reorder: vi.fn().mockResolvedValue({ success: true }),
}

const wrapper = mount(ImageEditor, { props: { store: stubStore } })
```

- [ ] **Step 5: Run frontend tests for the images feature**

```bash
pnpm --filter frontend exec vitest run images
```

Expected: ImageEditor tests pass; ProfileImageComponent.spec / ImageTag.spec pass.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/images apps/frontend/src/features/myprofile
git commit -m "refactor(frontend): ImageEditor takes store prop, decoupling from store choice"
```

---

## Task 14: Frontend — rename `ProfileImage.vue` → `GalleryImage.vue` and update shared zod imports

**Files:**

- Rename: `apps/frontend/src/features/images/components/ProfileImage.vue` → `apps/frontend/src/features/images/components/GalleryImage.vue`
- Rename: `apps/frontend/src/features/images/__tests__/ProfileImageComponent.spec.ts` → `apps/frontend/src/features/images/__tests__/GalleryImage.spec.ts` (and update its import)
- Modify: every importer of `ProfileImage.vue` (`ImageCarousel.vue`, etc.)
- Modify: every importer of `OwnerProfileImage` / `PublicProfileImage` from old DTO path

- [ ] **Step 1: Rename the component file and its test**

```bash
git mv apps/frontend/src/features/images/components/ProfileImage.vue apps/frontend/src/features/images/components/GalleryImage.vue
git mv apps/frontend/src/features/images/__tests__/ProfileImageComponent.spec.ts apps/frontend/src/features/images/__tests__/GalleryImage.spec.ts
```

- [ ] **Step 2: Update component name inside the file**

Open `GalleryImage.vue`. Find the `defineProps<{...}>()` and prop type — rename `ProfileImage` (if used as a type identifier) to `OwnerImage` or `PublicImage` as appropriate. Update imports from `@zod/profile/profileimage.dto` → `@zod/image/image.dto`.

If the component had an explicit `name: 'ProfileImage'` (Options API holdover or `defineOptions({ name })`), rename to `GalleryImage`.

- [ ] **Step 3: Find and update all importers**

```bash
grep -rln "components/ProfileImage\|/ProfileImage\.vue\|OwnerProfileImage\|PublicProfileImage\|ProfileImagePosition\|@zod/profile/profileimage" apps/frontend/src --include='*.ts' --include='*.vue'
```

For each match:

- `components/ProfileImage` (in import path) → `components/GalleryImage`
- `OwnerProfileImage` → `OwnerImage`
- `PublicProfileImage` → `PublicImage`
- `ProfileImagePosition` → `ImagePosition`
- `@zod/profile/profileimage.dto` → `@zod/image/image.dto`
- `ReorderProfileImagesPayload` → `ReorderImagesPayload`

- [ ] **Step 4: Repeat the same sweep on the backend (any leftover)**

```bash
grep -rln "OwnerProfileImage\|PublicProfileImage\|ProfileImagePosition\|@zod/profile/profileimage" apps/backend/src --include='*.ts'
```

Apply the same substitutions.

- [ ] **Step 5: Repeat on admin app**

```bash
grep -rln "OwnerProfileImage\|PublicProfileImage\|ProfileImagePosition\|@zod/profile/profileimage" apps/admin/src --include='*.ts' --include='*.vue'
```

Apply the same substitutions.

- [ ] **Step 6: Type-check the entire monorepo**

```bash
pnpm type-check
```

Expected: PASS. Any remaining errors point to a missed importer — find them via `grep` and fix.

- [ ] **Step 7: Commit**

```bash
git add apps apps/frontend apps/backend apps/admin
git commit -m "refactor: rename ProfileImage type/component to Image/GalleryImage repo-wide"
```

---

## Task 15: Final verification, changeset, and full CI suite

**Files:**

- Create: `.changeset/<adjective-noun-verb>.md`

- [ ] **Step 1: Run the full test suite**

```bash
pnpm test
```

Expected: PASS in all packages. If any test fails, fix before proceeding (do not skip or `.only`-out).

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: PASS. Fix any lint errors in touched files.

- [ ] **Step 3: Format only the files we changed**

```bash
git diff --name-only refactor/profileimage-drop-userid HEAD | grep -E '\.(ts|vue|prisma|sql|md)$' | xargs -r pnpm exec prettier --write
```

Then commit any formatting deltas:

```bash
git add -A && git diff --cached --quiet || git commit -m "chore: prettier formatting"
```

- [ ] **Step 4: Add the changeset**

Pick three random kebab-case words for the filename. Create `.changeset/silver-images-attach.md`:

```markdown
---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

Generalize image attachments: extract `Image` model from `ProfileImage`, add `UserContentImage` join, and expose `/api/content/:contentId/image/*` endpoints for post/event/community galleries.
```

- [ ] **Step 5: Run the full CI suite (mirrors GitHub Actions)**

```bash
pnpm run ci:test
```

Expected: PASS. This is the gate before opening a PR.

- [ ] **Step 6: Smoke-test in the browser**

Start the dev server:

```bash
pnpm dev
```

In Firefox (via firefox-devtools MCP `new_page`), navigate to `https://localhost:5173/me/edit`, log in if needed, and verify:

- The profile image gallery loads.
- Uploading a new image works and the new image appears in the carousel.
- Reordering by drag works.
- Deleting an image works and the carousel updates.

For the UserContent side, since post/event editor UX is out of scope, manually exercise the new endpoint with curl (the dev server uses session cookies — easiest to verify via the browser network tab). At minimum, confirm `GET /api/content/<some-content-id>/image` returns `{ success: true, images: [] }` for an owned content with no images.

Stop the dev server.

- [ ] **Step 7: Commit the changeset**

```bash
git add .changeset
git commit -m "chore(changeset): generalize image attachments"
```

- [ ] **Step 8: Push and open PR**

```bash
git push -u origin feat/image-attachments-design
gh pr create --title "feat: generalize image attachments beyond Profile" --body "$(cat <<'EOF'
## Summary

- Extracts a shared `Image` model from `ProfileImage`. `Image` is owner-keyed (`ownerProfileId`) and carries file metadata, position, and altText.
- Adds two thin join tables — `ProfileImage` (rebuilt) and `UserContentImage` — to express gallery membership. Exclusive attachment is enforced by `imageId` PK on each join + service-layer transactions.
- Splits `ImageService.storeImage` into `createImage` + `attachToProfile` / `attachToUserContent`. Routes compose them in one transaction.
- Adds `/api/content/:contentId/image` endpoints (GET/POST/PATCH order) for UserContent galleries. DELETE and altText updates flow through the unified `/api/image/:id` endpoint, which the service routes to the right gallery via `image.profileGallery` / `image.userContentGallery`.
- Frontend: renames `imageStore` → `profileImageStore`, adds `useUserContentImageStore(contentId)`, and refactors `ImageEditor.vue` to accept a `store: GalleryStore` prop. Renames `ProfileImage.vue` → `GalleryImage.vue`.
- Shared zod: renames `profileimage.dto` → `image.dto`; types renamed `ProfileImage*` → `Image*`.

## Migration

Single Prisma migration moves data from old `ProfileImage` into `Image` (IDs preserved) and rebuilds `ProfileImage` as a join. **No on-disk file moves** — the storage path scheme `images/<ownerProfileId>/...` already matched what's on disk.

## Test plan

- [x] Unit tests for `createImage`, `attachToProfile`, `attachToUserContent`, `deleteImage`, `updateImage`, `listProfileGallery`, `listUserContentGallery`, `reorderProfileGallery`, `reorderUserContentGallery`
- [x] Frontend store tests for `useUserContentImageStore`
- [x] Updated frontend tests for `ImageEditor.vue` with stub store
- [x] `pnpm test` passes
- [x] `pnpm type-check` passes
- [x] `pnpm run ci:test` passes
- [x] Manual smoke: upload/reorder/delete on `/me/edit` works

## Spec

[docs/superpowers/specs/2026-05-15-generalize-image-attachments-design.md](docs/superpowers/specs/2026-05-15-generalize-image-attachments-design.md)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 9: Watch CI in the background**

Spawn a subagent to watch CI:

```bash
gh run watch --exit-status
```

If CI passes, the PR is ready for review. If CI fails, download logs (`gh run view --log-failed`), fix, push, watch again.

---

## Out of scope (do NOT do in this plan)

- Post / event / community editor UX redesign to surface image upload (see spec).
- Public read endpoints for UserContent images (consumed via existing UserContent feed; embedding image data in those reads is a separate feature).
- Quota / rate limits per `Image.ownerProfileId`.
- Per-context variant tuning (post banners vs profile photos).
- Tag/community cover images.
