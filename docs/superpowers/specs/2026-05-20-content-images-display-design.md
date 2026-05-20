---
title: Display user-content images in cards and map popups
date: 2026-05-20
status: approved
---

# Display user-content images in cards & map popups

## Goal

Surface the attached image gallery on every user-content read path (feed cards, profile-page cards, owner-only cards, map popups) for all three kinds: post, event, community. The owner-side edit flow already exists (#1474 + #1476); this work makes those uploaded images visible to viewers.

## Background

- Authors can attach up to `MAX_IMAGES_PER_GALLERY` (= 6) images to a post / event / community via the `ContentImageButton` UI.
- The attached images live in `UserContentImage` (join) → `Image` (rows with `position`, `blurhash`, variants).
- **Today**, the per-kind hydrated includes (`postWithMetadataInclude`, `eventWithMetadataInclude`, `communityWithMetadataInclude`) eagerly load `postedBy.profileImages.image` but **not** `userContent.images`. As a result, `PublicPost`, `PublicEvent`, `PublicCommunity` (and their `Detail` + `Owner` variants) carry no field representing the content's own attached images.
- The single existing read path for the content gallery is `GET /content/:contentId/image`, which is **owner-only** (403 for foreign viewers) and is intended for the editor.

## Non-goals

- No changes to image upload / attach / detach / reorder UX — that all shipped in earlier PRs.
- No changes to the detail-panel views — only feed cards and map popups.
- No image-loading optimizations (deferred fetch, srcset variants, lazy-load) — out of scope. Images load with the card, just like profile images do today.

## Architecture

Mirror the existing `Profile.profileImages` pipeline end-to-end. Same DB shape, same `orderBy: { image: { position: 'asc' } }` include, same `OwnerImage[] | PublicImage[]` split, same `ImageCarousel` consumer — generalized to take an images array directly instead of a profile.

```
Image ← UserContentImage ← UserContent
                              ↓ (Prisma include via shared const)
                          mapDbXxxToPublic/Detail/Owner
                              ↓ (sets `images` field on DTO)
                          PublicPost/Event/Community DTO (carries images array)
                              ↓ (wire)
                          PostCard / EventCard / CommunityCard → <ImageCarousel :images>
                          PostMapPopup / EventMapPopup / CommunityMapPopup → <ImageTag :image="item.images[0]">
```

## DTO changes (`packages/shared/zod/`)

### Shared base — `userContent/userContent.dto.ts`

```ts
import { PublicImageSchema } from '@zod/image/image.dto'

export const UserContentMetadataSchema = z.object({
  id: z.string(),
  kind: ContentKindSchema,
  content: z.string(),
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  isOwn: z.boolean().default(false),
  images: z.array(PublicImageSchema).default([]),
})

export const PublicUserContentDetailBaseSchema = UserContentMetadataSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})
```

`PublicPost`, `PublicEvent`, `PublicCommunity` (and their `Detail` variants) all inherit `images: PublicImage[]` automatically.

### Owner schemas widen the type — `post.dto.ts`, `event.dto.ts`, `community.dto.ts`

```ts
import { OwnerImageSchema } from '@zod/image/image.dto'

export const OwnerPostSchema = PublicPostSchema
  .merge(OwnerUserContentOverlaySchema)
  .omit({ images: true })
  .extend({ images: z.array(OwnerImageSchema).default([]) })
```

Same for `OwnerEventSchema` and `OwnerCommunitySchema`. This gives owner UI components access to image ids for delete / reorder, while public viewers get id-less `PublicImage`.

## Prisma include (`apps/backend/src/services/`)

### Shared const — `userContent.service.ts`

```ts
export const userContentImagesInclude = {
  images: {
    include: { image: true },
    orderBy: { image: { position: 'asc' } },
  },
} as const
```

Spread into:
- `profileSummaryInclude` and `ownerHydratedInclude` (userContent.service.ts)
- `postWithMetadataInclude`, `postWithMetadataAndContextInclude` (post.service.ts)
- `eventWithMetadataInclude`, `eventWithMetadataAndContextInclude` (event.service.ts)
- `communityWithMetadataInclude`, `communityWithMetadataAndContextInclude` (community.service.ts)

Eight include objects total. Without a spread in all eight, some read paths (feed, nearby, /me, /profile/:id, bounds) would return rows without `.images`, and the mapper would crash or silently emit `[]`.

`post.service.ts`'s `attachPostContent` helper combines a metadata row with a separately-loaded `PostContent`; since images already live on the metadata row via the include, no extra plumbing is needed there.

## Mappers (`apps/backend/src/api/mappers/`)

Add a per-image projection at each mapper. For each of `mapDbPostToPublic`, `mapDbPostToDetail`, `mapDbEventToPublic`, `mapDbEventToDetail`, `mapDbCommunityToPublic`, `mapDbCommunityToDetail`:

```ts
images: row.images.map((j) => toPublicImage(j.image))
```

And for `mapDbPostToOwner`, `mapDbPostToOwner`, `mapDbCommunityToOwner`:

```ts
images: row.images.map((j) => toOwnerImage(j.image))
```

Images are already SQL-sorted by `image.position ASC`; no client-side sort.

## Frontend changes

### ImageCarousel generalization (`apps/frontend/src/features/publicprofile/components/ImageCarousel.vue`)

Current prop:
```ts
defineProps<{ profile: PublicProfile }>()
const images = computed(() => props.profile.profileImages ?? [])
```

New prop:
```ts
defineProps<{ images: PublicImage[] | OwnerImage[] }>()
const images = computed(() => props.images ?? [])
```

No other internal changes — the carousel is already keyed on `img.position`, uses `ImageTag` per slide, and watches the array for resets.

#### Call sites

- `ProfileContent.vue` line 39: `<ImageCarousel :profile />` → `<ImageCarousel :images="profile.profileImages" />`
- `ImageCarousel.spec.ts`: fixture changes from `makeProfile()` → array of image objects; prop name swap from `profile` → `images`.

### Cards (3 files)

For each of `PostCard.vue`, `EventCard.vue`, `CommunityCard.vue`, render the carousel at the top of the card body:

```vue
<ImageCarousel
  v-if="post.images.length > 0"
  :images="post.images"
  class="content-card-carousel mb-2"
/>
```

Hidden entirely when no images are attached. The carousel keeps its `ratio-4x3` slide ratio; SCSS adjustments per-card for spacing.

### Popups (3 files)

For each of `PostMapPopup.vue`, `EventMapPopup.vue`, `CommunityMapPopup.vue`, render the first image above the text:

```vue
<div
  v-if="item.images?.length"
  class="popup-image ratio ratio-4x3 mb-2"
>
  <ImageTag :image="item.images[0]" variant="card" />
</div>
```

### Post popup fetch parity

Today `PostMapPopup` is the only popup that receives the lightweight `PointFeature` directly. Two changes bring it in line with the event/community popups:

1. **`useBrowseViewModel.fetchPopupData` — `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts`**: remove the `if (poi?.kind === 'post') return null` short-circuit; add the symmetric branch:
   ```ts
   if (poi?.kind === 'post') {
     const result = await contentStore.fetchPublicPost(id, signal)
     return result.success && result.data ? result.data.post : null
   }
   ```
   `fetchPublicPost` already exists in `userContentStore`, but currently does NOT accept an `AbortSignal` argument (unlike `fetchPublicEvent` and `fetchPublicCommunity`). **Extend its signature** to `(id: string, signal?: AbortSignal)` and merge the external signal into its internal abort controller, mirroring the event/community implementations exactly. No new store method, but a small signature change.

2. **`PostMapPopup.vue` prop type**: change from `item: PointFeature` to `item: PublicPostDetail`.

3. **`OsmPoiMap.vue` simplification**: the special-case `popupItem.kind === 'post' ? popupItem : popupFullData` collapses to `popupFullData` because all three kinds now require a fetched detail. The corresponding `v-if` predicate simplifies to `popupResolver && popupTarget && popupFullData`.

## Tests

### Backend mapper specs

- **Update** `apps/backend/src/__tests__/api/post.mappers.spec.ts`: fixture rows gain an `images` array; each `mapDbPostToPublic/Detail/Owner` assertion gains an `images: [...]` check (with `id` only on Owner).
- **Update** `apps/backend/src/__tests__/api/event.mappers.spec.ts`: same.
- **Create** `apps/backend/src/__tests__/api/community.mappers.spec.ts` (currently absent): mirrors the post/event spec structure across all three mappers.

### Frontend component spec

- **Update** `apps/frontend/src/features/publicprofile/components/__tests__/ImageCarousel.spec.ts`: replace `makeProfile()` helper with an `images` array fixture; update `mount(ImageCarousel, { props: { images } })` calls; update the `setProps` test to swap an `images` array, not a profile.

## Risks & failure modes

- **Owner schema drift**: if `OwnerPostSchema` is missed in the `.omit({ images: true }).extend(...)` round, the owner UI sees `PublicImage[]` and can't delete/reorder. Test surface: any owner-side spec that asserts `image.id` will catch this.
- **Missing include on a read path**: if any of the 8 include sites is forgotten, that path returns rows without `.images`; mapper crashes. Eight-spot DRY via the shared const minimizes risk; spec tests catch it via the asserted `images` field.
- **Empty `images` cluster bloat**: cluster.service.ts now includes `images` on its `findAllWithLocation` rows (via `profileSummaryInclude`). For 500 cluster-index points this loads up to 3000 image rows in memory. Decision: accept this for now since the cluster cache is per-(profile, tags, kinds) and not on the hot path; revisit if it shows up in profiling.
- **Post-popup fetch latency**: post popups previously rendered instantly (PointFeature was already in hand). They now block on `fetchPublicPost`. UX parity with event/community popups, but a slight regression in apparent responsiveness for posts. The existing popup-cache pattern in `findProfileStore.fetchProfileForPopup` is not mirrored in `userContentStore` — out of scope to add here, but worth noting.

## Out of scope

- ImageCarousel feature additions (auto-advance, thumbnails strip, video support).
- Per-kind detail-view (full panel) image rendering — the detail panels read from the same hydrated row, so they automatically inherit the new `images` field; no further wiring needed.
- Popup-detail caching for content (parity with the profile popup LRU).
- Image-load optimization (lazy intersection-observer, srcset).
