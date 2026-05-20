# Content images display — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface attached user-content images on every read path (cards + map popups) for post / event / community, by adding `images` to the public DTOs and generalizing `ImageCarousel`.

**Architecture:** Mirror the existing `Profile.profileImages` pipeline. Prisma include (`orderBy: { image: { position: 'asc' } }`) → DTO field on shared base → per-kind mapper → frontend consumer. Cards render a generalized `<ImageCarousel :images>`. Popups render `<ImageTag>` for `images[0]`, after a uniform `fetchPublicXxx`-on-popup-open pattern.

**Tech Stack:** Prisma, Zod, Vue 3 (SFC), Pinia, Vitest.

---

## Task 1: Add `userContentImagesInclude` shared const + DTO `images` field

**Files:**
- Modify: `apps/backend/src/services/userContent.service.ts`
- Modify: `packages/shared/zod/userContent/userContent.dto.ts`
- Modify: `packages/shared/zod/post/post.dto.ts`
- Modify: `packages/shared/zod/event/event.dto.ts`
- Modify: `packages/shared/zod/community/community.dto.ts`

- [ ] **Step 1: Add `images` field to shared base schema**

In `packages/shared/zod/userContent/userContent.dto.ts`, add the import and extend `UserContentMetadataSchema`:

```ts
import { PublicImageSchema } from '../image/image.dto'

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
```

`PublicUserContentDetailBaseSchema` already extends `UserContentMetadataSchema`, so it inherits `images` automatically. No change there.

- [ ] **Step 2: Widen Owner schemas to OwnerImage[]**

In `packages/shared/zod/post/post.dto.ts`, change the Owner schema to omit-then-extend the image field:

```ts
import { MAX_IMAGES_PER_GALLERY, OwnerImageSchema } from '../image/image.dto'

export const OwnerPostSchema = PublicPostSchema
  .merge(OwnerUserContentOverlaySchema)
  .omit({ images: true })
  .extend({ images: z.array(OwnerImageSchema).default([]) })
export type OwnerPost = z.infer<typeof OwnerPostSchema>
```

Apply the same `.omit({ images: true }).extend({ images: z.array(OwnerImageSchema).default([]) })` pattern to:
- `packages/shared/zod/event/event.dto.ts` → `OwnerEventSchema`
- `packages/shared/zod/community/community.dto.ts` → `OwnerCommunitySchema`

Make sure `OwnerImageSchema` is imported in each.

- [ ] **Step 3: Add shared `userContentImagesInclude` const**

In `apps/backend/src/services/userContent.service.ts`, add a new exported const above the existing include constants:

```ts
export const userContentImagesInclude = {
  images: {
    include: { image: true },
    orderBy: { image: { position: 'asc' } },
  },
} as const satisfies Prisma.UserContentInclude
```

- [ ] **Step 4: Spread into the two base includes in userContent.service.ts**

```ts
const profileSummaryInclude = {
  postedBy: { include: { profileImages: { include: { image: true } } } },
  ...userContentImagesInclude,
} as const

const ownerHydratedInclude = {
  post: true,
  event: true,
  community: true,
  postedBy: { include: { profileImages: { include: { image: true } } } },
  ...userContentImagesInclude,
} as const
```

- [ ] **Step 5: Type-check**

Run: `pnpm --filter @opencupid/shared exec tsc --noEmit`
Expected: PASS.

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: errors only in mappers (next task) where `row.images` is now required by the schema but not yet projected — that's expected.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/zod/userContent/userContent.dto.ts packages/shared/zod/post/post.dto.ts packages/shared/zod/event/event.dto.ts packages/shared/zod/community/community.dto.ts apps/backend/src/services/userContent.service.ts
git commit -m "feat(content): add images field to user-content DTOs and shared Prisma include"
```

---

## Task 2: Spread `userContentImagesInclude` into per-kind service includes

**Files:**
- Modify: `apps/backend/src/services/post.service.ts`
- Modify: `apps/backend/src/services/event.service.ts`
- Modify: `apps/backend/src/services/community.service.ts`

- [ ] **Step 1: Spread shared const into post service includes**

In `post.service.ts`, import the shared const:

```ts
import {
  UserContentService,
  type ListOptions,
  type UserContentMetadataRow,
  userContentImagesInclude,
} from './userContent.service'
```

Update both include objects:

```ts
const postWithMetadataInclude = {
  post: true,
  postedBy: { include: { profileImages: { include: { image: true } } } },
  ...userContentImagesInclude,
} as const

const postWithMetadataAndContextInclude = (viewerProfileId: string) =>
  ({
    post: true,
    postedBy: {
      include: {
        profileImages: { include: { image: true } },
        ...conversationContextInclude(viewerProfileId),
      },
    },
    ...userContentImagesInclude,
  }) as const
```

- [ ] **Step 2: Spread shared const into event service includes**

Same pattern in `event.service.ts` for `eventWithMetadataInclude` and `eventWithMetadataAndContextInclude`. Import `userContentImagesInclude` from `./userContent.service`.

- [ ] **Step 3: Spread shared const into community service includes**

Same pattern in `community.service.ts` for `communityWithMetadataInclude` and `communityWithMetadataAndContextInclude`.

- [ ] **Step 4: Type-check**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: errors only in mappers (next task).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/post.service.ts apps/backend/src/services/event.service.ts apps/backend/src/services/community.service.ts
git commit -m "feat(content): include user-content images in per-kind hydrated reads"
```

---

## Task 3: Update mappers to project `images` field

**Files:**
- Modify: `apps/backend/src/api/mappers/post.mappers.ts`
- Modify: `apps/backend/src/api/mappers/event.mappers.ts`
- Modify: `apps/backend/src/api/mappers/community.mappers.ts`

- [ ] **Step 1: Project images in post mappers**

In `post.mappers.ts`, add to the existing imports:

```ts
import { toOwnerImage, toPublicImage } from './image.mappers'
```

Add `images: row.images.map((j) => toPublicImage(j.image))` to:
- `mapDbPostToPublic`'s return object
- `mapDbPostToDetail`'s return object

And add `images: row.images.map((j) => toOwnerImage(j.image))` inside the `OwnerPostSchema.parse({...})` call of `mapDbPostToOwner`.

Example for `mapDbPostToPublic`:

```ts
export function mapDbPostToPublic(row: PostWithMetadata, viewerProfileId: string): PublicPost {
  return {
    id: row.id,
    kind: 'post',
    type: row.post!.type,
    content: row.content,
    createdAt: row.createdAt,
    isOwn: row.postedById === viewerProfileId,
    postedBy: mapProfileSummary(row.postedBy),
    location: extractLocation(row) ?? undefined,
    images: row.images.map((j) => toPublicImage(j.image)),
  }
}
```

- [ ] **Step 2: Project images in event mappers**

Same pattern in `event.mappers.ts` — add the import and the `images:` projection to `mapDbEventToPublic`, `mapDbEventToDetail`, `mapDbEventToOwner`.

- [ ] **Step 3: Project images in community mappers**

Same pattern in `community.mappers.ts`.

- [ ] **Step 4: Type-check**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/mappers/post.mappers.ts apps/backend/src/api/mappers/event.mappers.ts apps/backend/src/api/mappers/community.mappers.ts
git commit -m "feat(content): project attached images through public/owner mappers"
```

---

## Task 4: Update mapper tests + create community.mappers.spec.ts

**Files:**
- Modify: `apps/backend/src/__tests__/api/post.mappers.spec.ts`
- Modify: `apps/backend/src/__tests__/api/event.mappers.spec.ts`
- Create: `apps/backend/src/__tests__/api/community.mappers.spec.ts`

- [ ] **Step 1: Update post.mappers.spec.ts fixture + add assertions**

Add the `image.mappers` mock near the top of the file (alongside the existing `profile.mappers` mock):

```ts
vi.mock('../../api/mappers/image.mappers', () => ({
  toPublicImage: (img: any) => ({
    mimeType: img.mimeType,
    altText: img.altText,
    position: img.position,
    blurhash: img.blurhash,
    variants: [],
  }),
  toOwnerImage: (img: any) => ({
    id: img.id,
    mimeType: img.mimeType,
    altText: img.altText,
    position: img.position,
    blurhash: img.blurhash,
    variants: [],
  }),
}))
```

Extend `baseDbPost` with an `images` array:

```ts
const baseDbPost: any = {
  // ...existing fields...
  images: [
    {
      image: {
        id: 'climg00000000000000001',
        mimeType: 'image/jpeg',
        altText: 'first',
        position: 0,
        blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        storagePath: '/x',
      },
    },
    {
      image: {
        id: 'climg00000000000000002',
        mimeType: 'image/jpeg',
        altText: 'second',
        position: 1,
        blurhash: null,
        storagePath: '/y',
      },
    },
  ],
}
```

Add the three new test cases:

```ts
it('projects attached images in PublicPost shape (no id)', () => {
  const result = mapDbPostToPublic(baseDbPost, 'viewer-profile-id')
  expect(result.images).toHaveLength(2)
  expect(result.images[0]).toEqual({
    mimeType: 'image/jpeg',
    altText: 'first',
    position: 0,
    blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    variants: [],
  })
  expect((result.images[0] as any).id).toBeUndefined()
})

it('projects attached images in OwnerPost shape (with id)', () => {
  const result = mapDbPostToOwner({ ...baseDbPost, postedById: 'clprofile000000000001' })
  expect(result.images).toHaveLength(2)
  expect(result.images[0].id).toBe('climg00000000000000001')
})

it('returns empty images array when content has none', () => {
  const result = mapDbPostToPublic({ ...baseDbPost, images: [] }, 'viewer-profile-id')
  expect(result.images).toEqual([])
})
```

Run: `pnpm --filter backend exec vitest run src/__tests__/api/post.mappers.spec.ts`
Expected: PASS.

- [ ] **Step 2: Update event.mappers.spec.ts**

Same pattern: add the `image.mappers` mock, extend `baseDbEvent` with an `images` array, add the three new test cases adapted for event mappers.

Run: `pnpm --filter backend exec vitest run src/__tests__/api/event.mappers.spec.ts`
Expected: PASS.

- [ ] **Step 3: Create community.mappers.spec.ts**

Write a new file modeled on `event.mappers.spec.ts`, asserting `mapDbCommunityToPublic`, `mapDbCommunityToDetail`, `mapDbCommunityToOwner`. Cover:
1. Basic shape (id, kind, content, yearFounded, location).
2. `isOwn=true` when viewer is poster.
3. Detail mapper attaches conversation context.
4. The three image-related cases (PublicImage, OwnerImage, empty).

Run: `pnpm --filter backend exec vitest run src/__tests__/api/community.mappers.spec.ts`
Expected: PASS.

- [ ] **Step 4: Run full backend test suite**

Run: `pnpm --filter backend test`
Expected: PASS — confirms no other test depends on the old DTO shape.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/__tests__/api/post.mappers.spec.ts apps/backend/src/__tests__/api/event.mappers.spec.ts apps/backend/src/__tests__/api/community.mappers.spec.ts
git commit -m "test(content): cover images projection in post/event/community mappers"
```

---

## Task 5: Generalize ImageCarousel to take `images` array

**Files:**
- Modify: `apps/frontend/src/features/publicprofile/components/ImageCarousel.vue`
- Modify: `apps/frontend/src/features/publicprofile/components/ProfileContent.vue`
- Modify: `apps/frontend/src/features/publicprofile/components/__tests__/ImageCarousel.spec.ts`

- [ ] **Step 1: Change ImageCarousel prop from `profile` to `images`**

In `ImageCarousel.vue`:

```ts
import type { OwnerImage, PublicImage } from '@zod/image/image.dto'

const props = defineProps<{
  images: ReadonlyArray<OwnerImage | PublicImage>
}>()
```

Replace `const images = computed(() => props.profile.profileImages ?? [])` with:

```ts
const images = computed(() => props.images ?? [])
```

Remove the now-unused `PublicProfile` import.

- [ ] **Step 2: Update ProfileContent.vue call site**

In `ProfileContent.vue` line 39, change:

```vue
<ImageCarousel :profile />
```

to:

```vue
<ImageCarousel :images="profile.profileImages" />
```

- [ ] **Step 3: Update ImageCarousel.spec.ts**

Replace `makeProfile()` helper with an `makeImages()` array helper:

```ts
const makeImages = (count = 3, withBlurhash = false) =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    position: i,
    variants: [{ size: 'original', url: `/img${i}` }],
    blurhash: withBlurhash ? 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' : null,
  }))

const mountCarousel = (images = makeImages()) =>
  mount(ImageCarousel, {
    props: { images: images as any },
    global: {
      stubs: {
        BModal: { template: '<div class="modal-stub"><slot /></div>' },
      },
    },
  })
```

Update the `resets inlineSlide when profileImages change` test to swap `images` directly via `setProps`.

- [ ] **Step 4: Run carousel tests**

Run: `pnpm --filter frontend exec vitest run src/features/publicprofile/components/__tests__/ImageCarousel.spec.ts`
Expected: PASS.

- [ ] **Step 5: Frontend type-check**

Run: `pnpm --filter frontend exec vue-tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/publicprofile/components/ImageCarousel.vue apps/frontend/src/features/publicprofile/components/ProfileContent.vue apps/frontend/src/features/publicprofile/components/__tests__/ImageCarousel.spec.ts
git commit -m "refactor(images): generalize ImageCarousel to take images array"
```

---

## Task 6: Wire ImageCarousel into PostCard, EventCard, CommunityCard

**Files:**
- Modify: `apps/frontend/src/features/posts/components/PostCard.vue`
- Modify: `apps/frontend/src/features/events/components/EventCard.vue`
- Modify: `apps/frontend/src/features/community/components/CommunityCard.vue`

- [ ] **Step 1: Wire into PostCard.vue**

Add the import:

```ts
import ImageCarousel from '@/features/publicprofile/components/ImageCarousel.vue'
```

Inside the `<PostIt>` body, above the `<p class="post-content">`, add:

```vue
<ImageCarousel
  v-if="post.images.length > 0"
  :images="post.images"
  class="content-card-carousel mb-2"
/>
```

Add to the `<style scoped>` block:

```scss
.content-card-carousel {
  border-radius: var(--radius-md);
  overflow: hidden;
}
```

- [ ] **Step 2: Wire into EventCard.vue**

Same import. Place the carousel above the `<BRow class="g-2 align-items-start mb-3">` row:

```vue
<ImageCarousel
  v-if="event.images.length > 0"
  :images="event.images"
  class="content-card-carousel mb-2"
/>
```

Add the same SCSS block.

- [ ] **Step 3: Wire into CommunityCard.vue**

Same import. Place the carousel above the `<BRow class="g-2 align-items-start mb-3">` row:

```vue
<ImageCarousel
  v-if="community.images.length > 0"
  :images="community.images"
  class="content-card-carousel mb-2"
/>
```

Add the same SCSS block.

- [ ] **Step 4: Run frontend tests + type-check**

Run: `pnpm --filter frontend exec vue-tsc --noEmit`
Expected: PASS.

Run: `pnpm --filter frontend test`
Expected: PASS — adjust any card-related fixtures that need an `images: []` field.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/posts/components/PostCard.vue apps/frontend/src/features/events/components/EventCard.vue apps/frontend/src/features/community/components/CommunityCard.vue
git commit -m "feat(content): render ImageCarousel in post/event/community cards"
```

---

## Task 7: Bring PostMapPopup into the fetched-detail pattern + show first image in all popups

**Files:**
- Modify: `apps/frontend/src/features/userContent/stores/userContentStore.ts`
- Modify: `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts`
- Modify: `apps/frontend/src/features/posts/components/PostMapPopup.vue`
- Modify: `apps/frontend/src/features/events/components/EventMapPopup.vue`
- Modify: `apps/frontend/src/features/community/components/CommunityMapPopup.vue`
- Modify: `apps/frontend/src/features/map/components/OsmPoiMap.vue`

- [ ] **Step 1: Extend `fetchPublicPost` to accept an AbortSignal**

In `userContentStore.ts`, update the signature and body to match `fetchPublicEvent`/`fetchPublicCommunity`:

```ts
async fetchPublicPost(
  id: string,
  signal?: AbortSignal
): Promise<StoreResponse<{ post: PublicPostDetail }>> {
  if (publicPostAbortController) publicPostAbortController.abort()
  const controller = new AbortController()
  publicPostAbortController = controller
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const res = await safeApiCall(() =>
      api.get<PublicPostDetailResponse>(`/content/posts/${id}`, { signal: controller.signal })
    )
    const post = PublicPostDetailSchema.parse(res.data.post)
    return storeSuccess({ post })
  } catch (error: any) {
    if (error instanceof CanceledError) return storeSuccess()
    return storeError(error, 'Failed to fetch post')
  }
},
```

- [ ] **Step 2: Wire post popup fetch in useBrowseViewModel**

In `useBrowseViewModel.ts`, replace the post branch:

```ts
const fetchPopupData = async (id: string, signal?: AbortSignal) => {
  const poi = allPois.value.find((p) => p.id === id)
  if (poi?.kind === 'post') {
    const result = await contentStore.fetchPublicPost(id, signal)
    return result.success && result.data ? result.data.post : null
  }
  if (poi?.kind === 'event') {
    const result = await contentStore.fetchPublicEvent(id, signal)
    return result.success && result.data ? result.data.event : null
  }
  if (poi?.kind === 'community') {
    const result = await contentStore.fetchPublicCommunity(id, signal)
    return result.success && result.data ? result.data.community : null
  }
  return findProfileStore.fetchProfileForPopup(id, signal)
}
```

- [ ] **Step 3: Change PostMapPopup prop to PublicPostDetail**

In `PostMapPopup.vue`:

```ts
import type { PublicPostDetail } from '@zod/post/post.dto'

defineProps<{ item: PublicPostDetail }>()
defineEmits<{ (e: 'click', id: string): void }>()
```

Replace the `(item.postContent ?? '')` usage with `item.content` (PublicPostDetail uses `content`).

- [ ] **Step 4: Simplify OsmPoiMap.vue**

Replace `popupItem.kind === 'post' ? popupItem : popupFullData` with just `popupFullData`. Update the `v-if`:

```vue
<Teleport
  v-if="popupResolver && popupTarget && popupItem && popupFullData"
  :to="popupTarget"
>
  <component
    :is="popupResolver(popupItem)"
    :item="popupFullData"
    @click="$emit('item:select', popupItem.id)"
  />
</Teleport>
```

Update the comment block to reflect the simplification ("All content kinds and profiles fetch detail before rendering the popup").

- [ ] **Step 5: Render first image in all 3 popups**

In `PostMapPopup.vue`, above the content div, add:

```vue
<div
  v-if="item.images?.length"
  class="popup-image ratio ratio-4x3 mb-2 rounded overflow-hidden"
>
  <ImageTag :image="item.images[0]" variant="card" />
</div>
```

Add the import: `import ImageTag from '@/features/images/components/ImageTag.vue'`.

Same pattern in `EventMapPopup.vue` (above `<div class="event-map-popup__content mb-1">`) and `CommunityMapPopup.vue` (above the `<div class="mb-2 text-primary d-flex flex-row">` block).

- [ ] **Step 6: Run frontend tests + type-check**

Run: `pnpm --filter frontend exec vue-tsc --noEmit`
Expected: PASS.

Run: `pnpm --filter frontend test`
Expected: PASS — note `OsmPoiMap.spec.ts` and `BrowseProfiles.spec.ts` mock these stores and resolvers; they may need fixture tweaks (e.g. `fetchPublicPost` mock return shape adjustment).

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/features/userContent/stores/userContentStore.ts apps/frontend/src/features/browse/composables/useBrowseViewModel.ts apps/frontend/src/features/posts/components/PostMapPopup.vue apps/frontend/src/features/events/components/EventMapPopup.vue apps/frontend/src/features/community/components/CommunityMapPopup.vue apps/frontend/src/features/map/components/OsmPoiMap.vue
git commit -m "feat(content): show first image on map popups; unify post popup fetch flow"
```

---

## Task 8: Full suite + changeset + prettier + PR

**Files:**
- Create: `.changeset/content-images-display.md`

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Write changeset**

```bash
cat > .changeset/content-images-display.md << 'EOF'
---
'@opencupid/backend': minor
'@opencupid/frontend': minor
'@opencupid/shared': minor
---

Display user-content images on post/event/community cards and map popups (#NN)
EOF
```

Commit:

```bash
git add .changeset/content-images-display.md
git commit -m "chore: add changeset for content images display"
```

- [ ] **Step 4: Format only modified files**

```bash
pnpm exec prettier --write \
  packages/shared/zod/userContent/userContent.dto.ts \
  packages/shared/zod/post/post.dto.ts \
  packages/shared/zod/event/event.dto.ts \
  packages/shared/zod/community/community.dto.ts \
  apps/backend/src/services/userContent.service.ts \
  apps/backend/src/services/post.service.ts \
  apps/backend/src/services/event.service.ts \
  apps/backend/src/services/community.service.ts \
  apps/backend/src/api/mappers/post.mappers.ts \
  apps/backend/src/api/mappers/event.mappers.ts \
  apps/backend/src/api/mappers/community.mappers.ts \
  apps/backend/src/__tests__/api/post.mappers.spec.ts \
  apps/backend/src/__tests__/api/event.mappers.spec.ts \
  apps/backend/src/__tests__/api/community.mappers.spec.ts \
  apps/frontend/src/features/publicprofile/components/ImageCarousel.vue \
  apps/frontend/src/features/publicprofile/components/ProfileContent.vue \
  apps/frontend/src/features/publicprofile/components/__tests__/ImageCarousel.spec.ts \
  apps/frontend/src/features/posts/components/PostCard.vue \
  apps/frontend/src/features/events/components/EventCard.vue \
  apps/frontend/src/features/community/components/CommunityCard.vue \
  apps/frontend/src/features/posts/components/PostMapPopup.vue \
  apps/frontend/src/features/events/components/EventMapPopup.vue \
  apps/frontend/src/features/community/components/CommunityMapPopup.vue \
  apps/frontend/src/features/map/components/OsmPoiMap.vue \
  apps/frontend/src/features/userContent/stores/userContentStore.ts \
  apps/frontend/src/features/browse/composables/useBrowseViewModel.ts
```

If reformatted, commit: `git add -A && git commit -m "chore: prettier"`.

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin feat/content-images-display
gh pr create --base main --title "feat(content): display attached images on cards and map popups" --body "$(cat <<'EOF'
## Summary
- Add an `images` field to `PublicPost/Event/Community` (and Detail + Owner variants) so attached gallery images flow through hydrated reads like `Profile.profileImages`.
- Generalize `ImageCarousel` to accept an `images` array directly; render it at the top of each card.
- Bring `PostMapPopup` into the same fetch-on-popup-open pattern as event/community popups; all three popups now show the first attached image.

## Test plan
- [ ] `pnpm test` is green
- [ ] `pnpm type-check` is green
- [ ] Smoke: post / event / community with images → card shows carousel, map popup shows first image
- [ ] Smoke: same with no images → no image area, no popup image
- [ ] Smoke: edit dialog gallery still works (no regression to #1474/#1476)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Start a background CI watcher**

Dispatch a watcher subagent on the most recent run id to be notified when the Test workflow completes.
