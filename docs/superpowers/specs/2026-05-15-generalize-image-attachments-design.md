# Generalize image attachments beyond Profile

**Status:** Design approved, awaiting implementation plan
**Date:** 2026-05-15
**Branch:** `feat/image-attachments-design` (off `refactor/profileimage-drop-userid`)

## Problem

Today, only `Profile` can have images. The `ProfileImage` model is owned by exactly one `Profile` (recent refactor 533fa97b removed the redundant `userId` column to make this clean). We want to attach image galleries to other entities — initially `UserContent` (post / event / community), with the door open for more later — without losing the integrity, simplicity, or storage layout of the current model.

## Goals

- A single `Image` model that stores file metadata, owned by the profile that uploaded it.
- Multiple ordered images per gallery, identical UX to the current Profile carousel.
- Profile galleries and UserContent galleries are structurally identical, differing only in which parent they hang off.
- One Prisma migration with no on-disk file moves.
- No regression in `Profile.hasFace` invariant or face-detection pipeline for profile uploads.

## Non-goals

- Reusable images (one image attached to multiple places). Exclusive attachment only — see §1.
- Drafts / staged uploads / orphan management. Detach == destroy — see §2.
- Async face detection. Synchronous, in-request, profile-only — see §2.
- New owner kinds beyond `Profile` and `UserContent`. The design accommodates them; we don't ship them.

## Glossary

- **Owner** — the profile that uploaded an image. Carried on `Image.ownerProfileId`. Drives lifecycle (cascade-delete on profile deletion), quota, and abuse tracking.
- **Attachment** — the gallery an image is currently displayed in. Carried on a per-context join table (`ProfileImage`, `UserContentImage`).
- **Gallery** — an ordered collection of images attached to one parent (one `Profile`'s carousel, one `UserContent`'s gallery).

Owner and attachment are independent. The Profile's own carousel is _one_ attachment of _its owner's_ uploaded images; a post's gallery is another attachment of (typically) the same owner's uploaded images.

## §1 — Schema

Three tables. `Image` is owner-keyed and carries the file metadata, position, and altText. The two join tables are gallery-membership records — thin pointers from a parent to an `Image`. Exclusive attachment (an Image is in at most one gallery at a time) is enforced by making `imageId` the primary key of each join table.

```prisma
model Image {
  id               String   @id @default(cuid())
  ownerProfileId   String
  ownerProfile     Profile  @relation("OwnedImages", fields: [ownerProfileId], references: [id], onDelete: Cascade)

  storagePath      String   @unique
  mimeType         String
  width            Int?
  height           Int?
  contentHash      String?
  blurhash         String?
  hasFace          Boolean  @default(false)
  isModerated      Boolean  @default(false)
  isFlagged        Boolean  @default(false)

  position         Int      @default(0)
  altText          String   @default("")

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

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

Back-relations to add:

```prisma
model Profile {
  // ... existing fields ...
  ownedImages   Image[]        @relation("OwnedImages")    // lifecycle (cascade-delete)
  profileImages ProfileImage[] @relation("ProfileImages") // display
}

model UserContent {
  // ... existing fields ...
  images UserContentImage[]
}
```

The existing `profileImages ProfileImage[] @relation("ProfileImages")` on `Profile` is removed; `profileImages` replaces it (different relation name to make the new semantics explicit and to avoid silent breakage in any code that still uses the old name).

### Why position/altText on Image

With exclusive attachment, an Image is in at most one gallery, so `position` and `altText` are 1:1 with `Image`. Today's schema has `@@index([profileId, position])` — an index, not a unique constraint — so position uniqueness is already enforced at the service layer (`count()` on insert, explicit reorder). Moving `position` onto `Image` loses no DB-level enforcement we had before.

Listing a gallery: `prisma.profileImage.findMany({ where: { profileId }, include: { image: true }, orderBy: { image: { position: 'asc' } } })`. Postgres can sort on a joined field cheaply for the small N (max ~10 images per gallery).

### Why per-table primary keys instead of separate ids

`imageId` as the join PK enforces "an Image appears in at most one row of this join" at the DB level. The cross-table invariant ("an Image is in either ProfileImage or UserContentImage, never both, and exactly one once attached") is service-layer enforced inside the same transaction that creates the join — same pattern as `syncProfileHasFace` today.

## §2 — Service layer

`ImageService` keeps its singleton shape. Storage is context-agnostic; attachment is context-aware. The current monolithic `storeImage(profileId, ...)` splits into `createImage` + `attachToX`.

```ts
class ImageService {
  // Pure image creation — no gallery membership.
  // Returns an unattached Image owned by ownerProfileId.
  // detectFace=true only for profile uploads.
  async createImage(
    ownerProfileId: string,
    tmpImagePath: string,
    altText: string,
    opts: { detectFace: boolean }
  ): Promise<Image>

  // Gallery operations — Profile
  async attachToProfile(imageId: string, profileId: string): Promise<void>
  async listProfileGallery(profileId: string): Promise<Image[]>
  async reorderProfileGallery(profileId: string, items: ImagePosition[]): Promise<Image[]>

  // Gallery operations — UserContent
  async attachToUserContent(imageId: string, userContentId: string): Promise<void>
  async listUserContentGallery(userContentId: string): Promise<Image[]>
  async reorderUserContentGallery(userContentId: string, items: ImagePosition[]): Promise<Image[]>

  // Detach == destroy. Caller doesn't need to know which gallery.
  async deleteImage(imageId: string, requesterProfileId: string): Promise<void>

  async updateImage(
    imageId: string,
    requesterProfileId: string,
    patch: { altText?: string }
  ): Promise<Image>
}
```

### Behaviors

- **`createImage`** does what `storeImage` does today minus the gallery insert: processes the file, writes the `Image` row. `position` defaults to 0 but is meaningless until attached. `detectFace` controls whether `ImageProcessor` runs the OpenCV face-detection step (`true` for profile uploads, `false` for UserContent uploads — adds ~100ms when on).
- **`attachToProfile` / `attachToUserContent`** — transactional insert into the join table that also computes `position = count(existing in gallery)` and updates `Image.position` accordingly. Validates ownership (`Image.ownerProfileId == requesterProfileId`) and that the Image isn't already attached. For `attachToProfile`, also runs `syncProfileHasFace` inside the transaction (the new image may become position-0 if the gallery was empty).
- **`deleteImage`** — uses `Image.profileGallery` / `Image.userContentGallery` to detect which join exists, deletes it, then deletes the `Image`, then `syncProfileHasFace` (only if the image was in a Profile gallery). All inside one Prisma transaction. File unlinks happen after commit, best-effort, log-only on failure (matches current behavior at [image.service.ts:238-245](apps/backend/src/services/image.service.ts#L238-L245)).
- **`updateImage`** — patches `Image.altText`. Owner check.
- **`reorderProfileGallery` / `reorderUserContentGallery`** — updates `Image.position` for all listed images (per current `reorderImages` logic, scoped to the gallery). For the Profile variant, `syncProfileHasFace` runs in the same transaction.
- **`syncProfileHasFace`** — unchanged in spirit but now reads from the join: `findFirst({ where: { profileGallery: { profileId } }, orderBy: { position: 'asc' } }).hasFace`.

### HTTP composition

Upload-and-attach is **one HTTP call, two service calls** in a single Prisma transaction. The HTTP API never returns an unattached `Image`; that intermediate state is internal-only.

### Why split createImage from attach

The alternative — `storeImage(ownerProfileId, tmpPath, altText, { context: 'profile' | 'usercontent', userContentId? })` — is the polymorphic dispatch that grows a switch every time a new owner kind appears. Splitting keeps each function single-purpose. Adding `Tag.coverImage` later means adding `attachToTag()`, not editing existing functions.

## §3 — HTTP API surface

Profile gallery endpoints stay as-is (no client churn). UserContent gallery is new.

```text
# Profile gallery
GET    /api/images/me                              → list profile gallery (owner view)
POST   /api/images                                 → upload + attach to caller's profile
PATCH  /api/images/:id                             → update altText
PATCH  /api/images/order                           → reorder profile gallery
DELETE /api/images/:id                             → detach + destroy

# UserContent gallery
GET    /api/usercontent/:contentId/images          → list gallery
POST   /api/usercontent/:contentId/images          → upload + attach
PATCH  /api/usercontent/:contentId/images/order    → reorder
# DELETE and PATCH altText reuse /api/images/:id (owner-checked at service layer)
```

### Authorization

- **Upload to UserContent**: caller must be `UserContent.postedBy` profile. Enforced at route layer.
- **Delete / update altText**: caller must be `Image.ownerProfileId`. Enforced at service layer (single check, both contexts).
- **Reorder**: caller must own the gallery's parent (Profile or UserContent), and all imageIds in the payload must be in that gallery.

### Why DELETE is unified at /api/images/:id

The client doesn't need to know whether an image lives in a profile or a UserContent gallery to delete it — the server figures that out. Splitting DELETE by context would force the client to carry redundant knowledge and would split a single permission check (owner equality) into two near-identical ones.

## §4 — Data migration

Single Prisma migration, no on-disk file moves. Existing `ProfileImage` rows already carry `profileId`, and the disk layout `images/<profileId>/<base>-*.webp` already encodes ownership.

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

-- 2) Backfill Image from ProfileImage (one row each, IDs preserved)
INSERT INTO "Image" (id, "ownerProfileId", "storagePath", "mimeType",
                     width, height, "contentHash", blurhash, "hasFace",
                     "isModerated", "isFlagged", position, "altText",
                     "createdAt", "updatedAt")
SELECT id, "profileId", "storagePath", "mimeType",
       width, height, "contentHash", blurhash, "hasFace",
       "isModerated", "isFlagged", position, "altText",
       "createdAt", "updatedAt"
FROM "ProfileImage";

-- 3) Rebuild ProfileImage as the join table
ALTER TABLE "ProfileImage" RENAME TO "ProfileImage_old";

CREATE TABLE "ProfileImage" (
  "imageId"   TEXT PRIMARY KEY REFERENCES "Image"(id) ON DELETE CASCADE,
  "profileId" TEXT NOT NULL REFERENCES "Profile"(id) ON DELETE CASCADE
);
CREATE INDEX "ProfileImage_profileId_idx" ON "ProfileImage"("profileId");

INSERT INTO "ProfileImage" ("imageId", "profileId")
SELECT id, "profileId" FROM "ProfileImage_old";

DROP TABLE "ProfileImage_old";

-- 4) New empty UserContentImage table
CREATE TABLE "UserContentImage" (
  "imageId"       TEXT PRIMARY KEY REFERENCES "Image"(id) ON DELETE CASCADE,
  "userContentId" TEXT NOT NULL REFERENCES "UserContent"(id) ON DELETE CASCADE
);
CREATE INDEX "UserContentImage_userContentId_idx" ON "UserContentImage"("userContentId");
```

### Properties

- **`Image.id` reuses `ProfileImage.id`.** External caches, URLs, push payloads, and admin tooling that captured raw IDs continue to resolve.
- **No file moves on disk.** `storagePath` is preserved verbatim; the path scheme `images/<ownerProfileId>/<base>-*.webp` already matches what's on disk because `ownerProfileId == old profileId` for every existing row.
- **Single transaction.** Prisma migrations run inside a transaction. If backfill fails, rollback is automatic.
- **Rename → backfill → drop.** The `ProfileImage_old` rename pattern is required because Prisma's schema diff would otherwise drop+recreate `ProfileImage` and lose row data.
- **All cascades preserved.** Deleting a `Profile` cascades to `Image` (via owner FK) which cascades to both join tables.

### Rollout

`prisma migrate deploy` — single statement, no app changes needed in flight. The new server code is what reads/writes the new shape, so deployment is one shot (release the migration and the new backend together; the migration must run before the backend container starts, which is the existing deploy order per [CLAUDE.md → Production deployment](../../CLAUDE.md#production-deployment)).

## §5 — Frontend changes

The images feature ([apps/frontend/src/features/images/](../../apps/frontend/src/features/images/)) is already self-contained. Generalize the existing pieces and add a sibling store for UserContent — no new components.

```text
apps/frontend/src/features/images/
  components/
    ImageUpload.vue      # already context-free; takes onUpload callback
    ImageEditor.vue      # rename props from "profileImages" → "images"; takes store: GalleryStore
    ImageTag.vue         # unchanged
    ProfileImage.vue     # rename → GalleryImage.vue (renders any Image)
  stores/
    profileImageStore.ts       # was imageStore.ts — Profile gallery
    userContentImageStore.ts   # NEW — same shape, different endpoints
```

Both stores satisfy:

```ts
interface GalleryStore {
  images: Ref<Image[]>
  load(): Promise<void>
  upload(file: File, altText: string): Promise<void>
  remove(imageId: string): Promise<void>
  reorder(items: ImagePosition[]): Promise<void>
  updateAlt(imageId: string, altText: string): Promise<void>
}
```

`ImageEditor.vue` takes a `store: GalleryStore` prop and is fully reusable across galleries. The myprofile feature passes `useProfileImageStore()`; future post/event/community editors pass `useUserContentImageStore(contentId)`.

### Integration points outside the images feature

1. **`ImageCarousel.vue`** ([publicprofile/components/ImageCarousel.vue](../../apps/frontend/src/features/publicprofile/components/ImageCarousel.vue)) — already takes images as a prop; only the imported type rename `ProfileImage` → `Image` is needed.
2. **Post / event / community editors** ([apps/frontend/src/features/posts](../../apps/frontend/src/features/posts), etc.) — gain an `<ImageEditor :store="useUserContentImageStore(contentId)" />` block. UX of those editors is **out of scope** for this spec.

### Shared types

Rename `ProfileImage` → `Image` in [packages/shared/zod/](../../packages/shared/zod/) (auto-regenerated from Prisma). DTO renames in lockstep:

- `ImageApiResponse` (already named correctly)
- `ProfileImagePosition` → `ImagePosition`

TypeScript will surface every callsite. Mechanical sweep, not a rewrite.

### Tests

Existing image tests ([`__tests__/`](../../apps/frontend/src/features/images/__tests__/)) need rename + minor fixture adjustments — behavior under test doesn't change. New tests for `userContentImageStore` mirror the profile-store tests.

## Open questions

None at design time. Implementation plan will surface anything missed.

## Out of scope (future work)

- Post / event / community editor UX redesign to surface image upload.
- Public read endpoints for UserContent images (the consumer side — `GET /api/usercontent/:id/images` is owner-view; public viewing comes via the existing UserContent feed which will need to embed image data).
- Quota / rate limits per `Image.ownerProfileId` (today's per-route rate limit on POST /api/images is per-IP).
- Image variants tuned for non-profile contexts (post banners may want different aspect ratios than profile photos — currently all share the same `variants` config in [image.service.ts:23-28](../../apps/backend/src/services/image.service.ts#L23-L28)).
