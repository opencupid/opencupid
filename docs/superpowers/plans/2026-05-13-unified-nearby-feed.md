# Unified bounds feed for `NearbyFeatures` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-only `/content/posts/bounds` path with the existing kind-neutral `/content/bounds` endpoint and render mixed posts/events/communities in `NearbyFeatures` via per-kind teaser components.

**Architecture:** The kind-agnostic `GET /content/bounds` route already exists and returns `UserContentMetadata[]` — the work is mostly **deletion + rewiring** on the frontend, with a small extension to `UserContentService.findInBounds` (sort + cap) on the backend. `NearbyFeatures` dispatches by `item.kind` to three teaser components: existing `<PostIt>`, new `<EventTeaser>`, new `<CommunityTeaser>`.

**Tech Stack:** Vue 3 + Pinia + Fastify + Prisma + Zod. Tests: Vitest (frontend + backend).

**Branch:** `feat/unified-nearby-feed` (already created; design committed as `1f9ef3b1`).

**Spec:** [docs/superpowers/specs/2026-05-13-unified-nearby-feed-design.md](../specs/2026-05-13-unified-nearby-feed-design.md)

**Pre-flight grep results (informs scope of deletions):**

- `PostSummary` / `mapPostSummary` are **still used** by `search.route.ts`, `SearchBar.vue`, `SearchMatches.vue`. **Do NOT delete them.** Only the bounds-specific path goes away.
- `PostSummariesResponse` is used only by the deleted store action — safe to delete.
- `findInBoundsHydrated` is used only by the deleted route — safe to delete.
- `attachPostContent` (private helper) is used only by the deleted hydrator — safe to delete.

---

## File Structure

### Backend

| File | Responsibility | Change |
| --- | --- | --- |
| `apps/backend/src/services/userContent.service.ts` | Kind-agnostic content reads | Extend `findInBounds` with limit + ordering |
| `apps/backend/src/api/routes/content.route.ts` | `/content/*` aggregator | Pass `{ limit: 50 }` to `findInBounds` |
| `apps/backend/src/api/routes/content/post.route.ts` | Post-only CRUD + reads | Delete `GET /bounds` handler |
| `apps/backend/src/services/post.service.ts` | Post-only service | Delete `findInBoundsHydrated`, `attachPostContent` |
| `apps/backend/src/__tests__/routes/content/post.route.spec.ts` | Post route tests | Delete `/bounds` test cases |
| `apps/backend/src/__tests__/routes/content/contentRoutes.bounds.spec.ts` *(new or extends existing)* | Unified bounds route tests | New tests for limit + ordering |

### Shared DTO

| File | Responsibility | Change |
| --- | --- | --- |
| `packages/shared/zod/apiResponse.dto.ts` | API response types | Delete `PostSummariesResponse` |

### Frontend

| File | Responsibility | Change |
| --- | --- | --- |
| `apps/frontend/src/features/userContent/stores/userContentStore.ts` | Content store | Replace `postSummaries`/`fetchPostsInBounds` with `feedItems`/`fetchFeedInBounds` |
| `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts` | Browse view-model | Call `fetchFeedInBounds` in `onBoundsChanged` |
| `apps/frontend/src/features/browse/components/NearbyFeatures.vue` | Bottom strip | Accept `items: UserContentMetadata[]`; dispatch by kind |
| `apps/frontend/src/features/browse/views/BrowseProfiles.vue` | Browse view | Bind `feedItems`; replace `onNearbyPostSelect` with kind dispatcher |
| `apps/frontend/src/features/events/components/EventTeaser.vue` *(new)* | Event teaser card | Render event metadata teaser |
| `apps/frontend/src/features/community/components/CommunityTeaser.vue` *(new)* | Community teaser card | Render community metadata teaser |
| `apps/frontend/src/features/userContent/stores/__tests__/userContentStore.spec.ts` | Store tests | Replace `fetchPostsInBounds` test with `fetchFeedInBounds` |
| `apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.spec.ts` | View-model tests | Rename mock + assertions |
| `apps/frontend/src/features/browse/components/__tests__/NearbyFeatures.spec.ts` | Component tests | Test mixed-kind dispatch |
| `apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts` | View tests | Rename mock + assert kind dispatch |

---

## Task 1: Backend — extend `findInBounds` with limit + ordering

**Files:**

- Modify: `apps/backend/src/services/userContent.service.ts:78-88`
- Test: `apps/backend/src/__tests__/services/userContent.service.spec.ts` *(verify file exists; if not, the test for ordering goes into the route spec in Task 4)*

- [ ] **Step 1: Confirm the service-spec file location**

Run: `ls apps/backend/src/__tests__/services/ | grep -i userContent`
Expected: either the file exists, or empty output. If empty, defer ordering verification to Task 4 (route spec) which exercises the same path.

- [ ] **Step 2: Modify `findInBounds` to accept a limit option and apply ordering**

Replace the existing method body at `apps/backend/src/services/userContent.service.ts:78-88` with:

```ts
  async findInBounds(
    box: BoundsBox,
    opts: { limit?: number } = {}
  ): Promise<UserContentMetadataRow[]> {
    return prisma.userContent.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
        lat: { gte: box.south, lte: box.north },
        lon: { gte: box.west, lte: box.east },
      },
      include: profileSummaryInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit ?? 50,
    })
  }
```

`orderBy` is an array so `createdAt desc` is the primary key and `id asc` is the deterministic tiebreaker.

- [ ] **Step 3: Run any service-level tests if present**

Run: `pnpm --filter backend exec vitest run userContent.service`
Expected: PASS (existing tests should be unaffected; new behaviour is asserted at the route level in Task 4).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/services/userContent.service.ts
git commit -m "feat(content): cap and order findInBounds (desc createdAt, limit 50)"
```

---

## Task 2: Backend — wire the limit into the existing `/content/bounds` handler

**Files:**

- Modify: `apps/backend/src/api/routes/content.route.ts:35-41`

- [ ] **Step 1: Update the `/bounds` handler to pass the limit**

Replace `apps/backend/src/api/routes/content.route.ts:35-41` with:

```ts
  fastify.get('/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const parsed = BoundsQuerySchema.safeParse(req.query)
    if (!parsed.success) return sendError(reply, 400, 'Invalid bounds')
    const rows = await svc.findInBounds(parsed.data, { limit: 50 })
    const items = rows.map((r) => mapUserContentMetadata(r, req.session.profileId))
    return reply.code(200).send({ success: true, items })
  })
```

The only line that changes is `findInBounds(parsed.data, { limit: 50 })` — explicit at the route layer so the cap is visible to a reviewer scanning the route file.

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/api/routes/content.route.ts
git commit -m "feat(content): pass limit to /content/bounds"
```

---

## Task 3: Backend — write failing tests for unified bounds route behaviour

**Files:**

- Test: `apps/backend/src/__tests__/routes/content/contentRoutes.bounds.spec.ts` *(new — only if not already covered by a sibling spec)*

- [ ] **Step 1: Check whether unified-route bounds tests already exist**

Run: `grep -rln "'/content/bounds'\|\\\"/content/bounds\\\"" apps/backend/src/__tests__/`
Expected: no match (the existing `post.route.spec.ts` tests `/content/posts/bounds`, not the unified path). If a match exists, extend that file instead of creating a new one — adjust paths below accordingly.

- [ ] **Step 2: Create the bounds-route spec**

Create `apps/backend/src/__tests__/routes/content/contentRoutes.bounds.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import contentRoutes from '@/api/routes/content.route'

const mockUserContentService = {
  findInBounds: vi.fn(),
  findFeed: vi.fn(),
  findByProfileIdOwner: vi.fn(),
  findNearby: vi.fn(),
  findByProfileId: vi.fn(),
  findByIdMetadata: vi.fn(),
}

vi.mock('@/services/userContent.service', () => ({
  UserContentService: { getInstance: () => mockUserContentService },
}))

vi.mock('@/api/mappers/userContent.mappers', () => ({
  mapUserContentMetadata: (row: any, _viewerId: string) => ({
    id: row.id,
    kind: row.kind,
    createdAt: row.createdAt,
  }),
  mapOwnerUserContent: (r: any) => r,
}))

async function buildApp() {
  const app = Fastify()
  app.decorate('authenticate', async () => {})
  app.addHook('onRequest', async (req) => {
    ;(req as any).session = { profileId: 'viewer-id' }
  })
  await app.register(contentRoutes)
  return app
}

const BOX = { north: 1, south: 0, east: 1, west: 0 }

describe('GET /content/bounds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards parsed bounds and a limit of 50 to the service', async () => {
    mockUserContentService.findInBounds.mockResolvedValue([])
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/bounds', query: BOX as any })
    expect(res.statusCode).toBe(200)
    expect(mockUserContentService.findInBounds).toHaveBeenCalledWith(BOX, { limit: 50 })
  })

  it('returns a 400 for invalid bounds payloads', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/bounds', query: { north: 'oops' } as any })
    expect(res.statusCode).toBe(400)
    expect(mockUserContentService.findInBounds).not.toHaveBeenCalled()
  })

  it('returns mixed-kind items mapped through the metadata mapper', async () => {
    const rows = [
      { id: 'p1', kind: 'post', createdAt: new Date('2026-05-13T10:00:00Z') },
      { id: 'e1', kind: 'event', createdAt: new Date('2026-05-13T09:00:00Z') },
      { id: 'c1', kind: 'community', createdAt: new Date('2026-05-13T08:00:00Z') },
    ]
    mockUserContentService.findInBounds.mockResolvedValue(rows)
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/bounds', query: BOX as any })
    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.items.map((i: any) => [i.id, i.kind])).toEqual([
      ['p1', 'post'],
      ['e1', 'event'],
      ['c1', 'community'],
    ])
  })
})
```

- [ ] **Step 3: Run the spec — it should pass already (Tasks 1 + 2 are done)**

Run: `pnpm --filter backend exec vitest run contentRoutes.bounds.spec`
Expected: 3 PASS. (If FAIL because of import/path differences, adapt to match neighbouring spec files; the `post.route.spec.ts` next door is a working template.)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/__tests__/routes/content/contentRoutes.bounds.spec.ts
git commit -m "test(content): cover unified /content/bounds route behaviour"
```

---

## Task 4: Backend — delete `/content/posts/bounds` and its test cases

**Files:**

- Modify: `apps/backend/src/api/routes/content/post.route.ts:13, 19, 81-92` (delete the route + adjust imports)
- Modify: `apps/backend/src/__tests__/routes/content/post.route.spec.ts:22, 59, 316-end-of-bounds-test`
- Modify: `apps/backend/src/services/post.service.ts:135-150` (delete `findInBoundsHydrated` + `attachPostContent` if unused)

- [ ] **Step 1: Inspect the post-bounds route block to delete**

Run: `sed -n '78,95p' apps/backend/src/api/routes/content/post.route.ts`
Expected: shows the `/bounds` handler from Task 0 of the spec (already analysed).

- [ ] **Step 2: Delete the `/bounds` handler**

Remove lines 81–92 from `apps/backend/src/api/routes/content/post.route.ts`. Also remove these now-unused imports from the same file:

- `import { BoundsQuerySchema } from '@zod/dto/bounds.dto'` (line 13)
- `mapPostSummary,` from the `'../mappers/post.mappers'` import block (line 19) — **only** if no other handler in this file uses `mapPostSummary`. Verify by grepping the file before removing.

Run: `grep -n "mapPostSummary\|BoundsQuerySchema" apps/backend/src/api/routes/content/post.route.ts`
Expected (after edits): no matches.

- [ ] **Step 3: Delete `findInBoundsHydrated` and the now-unused `attachPostContent` helper**

Open `apps/backend/src/services/post.service.ts`. Delete `findInBoundsHydrated` (lines 135–138 in the original) and `attachPostContent` (lines 140–150). Before deleting `attachPostContent`, verify no other caller:

Run: `grep -n "attachPostContent" apps/backend/src/services/post.service.ts`
Expected (before edit): the method definition + the call from `findInBoundsHydrated` only. (`findFeedHydrated` and `findNearbyHydrated` both call it too — **DO NOT delete `attachPostContent` if they still call it**. Re-read the file and only delete `findInBoundsHydrated` if `attachPostContent` is referenced from other still-live methods.)

If `attachPostContent` is still referenced by `findFeedHydrated` / `findNearbyHydrated`, keep it; only delete `findInBoundsHydrated`.

- [ ] **Step 4: Delete the post-route bounds test cases**

In `apps/backend/src/__tests__/routes/content/post.route.spec.ts`:

- Remove `findInBoundsHydrated: vi.fn(),` from the mock at line 59.
- Remove the `mapPostSummary` mock entry at line 22 if no other test in the file uses it (grep first).
- Remove the test block that calls `mockPostService.findInBoundsHydrated` (around lines 316–end-of-that-`it`).

Run: `grep -n "findInBoundsHydrated\|/bounds" apps/backend/src/__tests__/routes/content/post.route.spec.ts`
Expected (after edits): no matches.

- [ ] **Step 5: Run all backend content-route tests to verify nothing regressed**

Run: `pnpm --filter backend exec vitest run routes/content`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/api/routes/content/post.route.ts \
        apps/backend/src/services/post.service.ts \
        apps/backend/src/__tests__/routes/content/post.route.spec.ts
git commit -m "refactor(post): remove /content/posts/bounds and findInBoundsHydrated"
```

---

## Task 5: Shared DTO — delete `PostSummariesResponse`

**Files:**

- Modify: `packages/shared/zod/apiResponse.dto.ts:114`

- [ ] **Step 1: Verify `PostSummariesResponse` is only used in the soon-to-be-modified store**

Run: `grep -rn "PostSummariesResponse" apps packages 2>/dev/null | grep -v node_modules`
Expected: matches in `apiResponse.dto.ts` (definition) + `userContentStore.ts` (single usage). If there are other matches, do NOT delete yet — flag the additional caller for review.

- [ ] **Step 2: Delete the type**

Remove `export type PostSummariesResponse = ApiSuccess<{ posts: PostSummary[] }>` at line 114 of `packages/shared/zod/apiResponse.dto.ts`.

Run: `grep -n "PostSummariesResponse" packages/shared/zod/apiResponse.dto.ts`
Expected: no match.

- [ ] **Step 3: Defer commit** — the store still imports this symbol. Will commit together with Task 6 where the import is removed.

---

## Task 6: Frontend store — replace `postSummaries`/`fetchPostsInBounds` with `feedItems`/`fetchFeedInBounds`

**Files:**

- Modify: `apps/frontend/src/features/userContent/stores/userContentStore.ts`

- [ ] **Step 1: Replace the imports block at the top of `userContentStore.ts`**

In `apps/frontend/src/features/userContent/stores/userContentStore.ts`:

- Remove `PostSummarySchema,` and `type PostSummary,` from the `@zod/post/post.dto` import (lines 8, 13).
- Remove `PostSummariesResponse,` from the `@zod/apiResponse.dto` import block (line 34).
- Add a new import: `import { UserContentMetadataSchema, type UserContentMetadata } from '@zod/userContent/userContent.dto'`.

The final imports should not reference `PostSummary`, `PostSummarySchema`, or `PostSummariesResponse` anywhere in this file.

- [ ] **Step 2: Replace the array schema constant**

Replace line 53:

```ts
const PostSummaryArraySchema = PostSummarySchema.array()
```

with:

```ts
const UserContentMetadataArraySchema = UserContentMetadataSchema.array()
```

- [ ] **Step 3: Replace the response type alias**

Replace line 59:

```ts
type StorePostSummariesResponse = StoreResponse<{ posts: PostSummary[] }>
```

with:

```ts
type StoreFeedItemsResponse = StoreResponse<{ items: UserContentMetadata[] }>
```

- [ ] **Step 4: Replace state field**

In the `state: () => ({ ... })` block (around lines 78–85):

- Remove the `/** Map-bounds teasers — populated by fetchPostsInBounds. */` JSDoc and the `postSummaries: [] as PostSummary[],` line.
- Add `/** Map-bounds feed items — populated by fetchFeedInBounds. */` and `feedItems: [] as UserContentMetadata[],`.

- [ ] **Step 5: Update the store-level JSDoc**

Replace lines 73–75 of the store JSDoc (the `postSummaries` / `fetchPostsInBounds` paragraph) with text describing the new unified field. Aim for a single sentence — present tense, no history. Example:

> `* fetchFeedInBounds populates feedItems with kind-mixed UserContentMetadata`
> `* for the map's bottom strip.`

- [ ] **Step 6: Replace `fetchPostsInBounds` with `fetchFeedInBounds`**

Replace lines 349–360 (the entire `fetchPostsInBounds` action) with:

```ts
    async fetchFeedInBounds(bounds: MapBounds): Promise<StoreFeedItemsResponse> {
      try {
        const res = await safeApiCall(() =>
          api.get<{ success: true; items: UserContentMetadata[] }>('/content/bounds', {
            params: bounds,
          })
        )
        const items = UserContentMetadataArraySchema.parse(res.data.items)
        this.feedItems = items
        return storeSuccess({ items })
      } catch (error: any) {
        return storeError(error, 'Failed to fetch feed in bounds')
      }
    },
```

The endpoint changes from `/content/posts/bounds` to `/content/bounds`; the response payload key changes from `posts` to `items`.

- [ ] **Step 7: Type-check the frontend**

Run: `pnpm --filter frontend exec vue-tsc --noEmit -p tsconfig.json 2>&1 | head -40`
Expected: no errors in `userContentStore.ts`. Errors in callers (`useBrowseViewModel.ts`, `BrowseProfiles.vue`, tests) are expected — those are fixed in later tasks.

- [ ] **Step 8: Defer commit** — multiple callers still reference the old API; will commit after their tests pass in Task 11.

---

## Task 7: Frontend store — write the unit test for `fetchFeedInBounds`

**Files:**

- Modify: `apps/frontend/src/features/userContent/stores/__tests__/userContentStore.spec.ts:304-329`

- [ ] **Step 1: Replace the `fetchPostsInBounds` describe block**

In `apps/frontend/src/features/userContent/stores/__tests__/userContentStore.spec.ts`, replace lines 304–329 (the `describe('fetchPostsInBounds', …)` block) with:

```ts
  describe('fetchFeedInBounds', () => {
    it('populates feedItems on success', async () => {
      const store = useUserContentStore()
      const items = [
        {
          id: CUID_1,
          kind: 'post',
          content: 'a',
          createdAt: new Date('2026-05-13T10:00:00Z').toISOString(),
          isOwn: false,
          postedBy: profileSummary,
          location: { country: 'US' },
        },
        {
          id: 'event-2',
          kind: 'event',
          content: 'b',
          createdAt: new Date('2026-05-13T09:00:00Z').toISOString(),
          isOwn: false,
          postedBy: profileSummary,
          location: { country: 'US' },
        },
      ]
      mockApi.get.mockResolvedValue({ data: { success: true, items } })

      const result = await store.fetchFeedInBounds({
        north: 0,
        south: 0,
        east: 0,
        west: 0,
      } as any)

      expect(result.success).toBe(true)
      expect(mockApi.get).toHaveBeenCalledWith('/content/bounds', { params: expect.any(Object) })
      expect(store.feedItems.map((i) => [i.id, i.kind])).toEqual([
        [CUID_1, 'post'],
        ['event-2', 'event'],
      ])
    })
  })
```

The fixture must match `UserContentMetadataSchema`'s required fields (`id, kind, content, postedBy, createdAt, isOwn` plus optional `location`); adapt the existing `profileSummary` reference at the top of the file.

- [ ] **Step 2: Run the store spec**

Run: `pnpm --filter frontend exec vitest run userContentStore.spec`
Expected: PASS for the new `fetchFeedInBounds` test. Other tests in the file (which use `myContent`, post/event/community CRUD) should remain green.

- [ ] **Step 3: Defer commit** — same commit batch as Task 6.

---

## Task 8: Frontend view-model — call the new action

**Files:**

- Modify: `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts:140-145` + the JSDoc at lines 8-14
- Modify: `apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.spec.ts:16-32, 195-200`

- [ ] **Step 1: Update the composable JSDoc**

Replace the JSDoc block at the top of `useBrowseViewModel.ts` (lines 8–14) so it no longer mentions `postSummaries`. Suggested wording (one sentence):

```ts
/**
 * View-model for the browse map. Map POIs derive from findProfileStore
 * cluster features. A single bounds event triggers parallel fetches:
 * cluster features for map markers and userContentStore.feedItems for
 * the NearbyFeatures strip (BrowseProfiles consumes feedItems directly
 * from the store, not via this view-model).
 */
```

- [ ] **Step 2: Update `onBoundsChanged` to call the new action**

Replace lines 140–145 with:

```ts
  async function onBoundsChanged({ bounds, zoom }: BoundsWithZoom) {
    await Promise.all([
      findProfileStore.fetchBounds(bounds, zoom),
      contentStore.fetchFeedInBounds(bounds),
    ])
  }
```

Only one identifier changes: `fetchPostsInBounds` → `fetchFeedInBounds`.

- [ ] **Step 3: Update the view-model test mock**

In `apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.spec.ts`:

- Rename the mock function at line 16: `const fetchFeedInBounds = vi.fn().mockResolvedValue({ success: true })`.
- Rename the ref at line 17: `const feedItems = ref<any[]>([])`.
- Update the store mock at line 19: `useUserContentStore: () => ({ fetchFeedInBounds, feedItems }),`.
- Reset at line 32: `feedItems.value = []`.
- Update the assertion at line 197: `expect(fetchFeedInBounds).toHaveBeenCalledWith({ ... })`.

- [ ] **Step 4: Run the view-model spec**

Run: `pnpm --filter frontend exec vitest run useBrowseViewModel.spec`
Expected: PASS.

- [ ] **Step 5: Defer commit** — same commit batch.

---

## Task 9: Frontend — write the failing test for `NearbyFeatures` mixed-kind dispatch

**Files:**

- Modify: `apps/frontend/src/features/browse/components/__tests__/NearbyFeatures.spec.ts`

- [ ] **Step 1: Replace the test fixtures with mixed-kind metadata items**

In `NearbyFeatures.spec.ts`, replace the `makePost` helper (line 33) and any post-only fixtures with a generic factory and three kind-specific fixtures:

```ts
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'

const profileSummary = {
  id: 'p1',
  publicName: 'Alice',
  profileImages: [],
} as any

function makeItem(
  id: string,
  kind: 'post' | 'event' | 'community',
  content: string
): UserContentMetadata {
  return {
    id,
    kind,
    content,
    postedBy: profileSummary,
    location: { country: 'US' },
    createdAt: new Date('2026-05-13T10:00:00Z'),
    isOwn: false,
  }
}
```

- [ ] **Step 2: Replace existing tests with kind-dispatch tests**

Replace the existing `it(...)` blocks with:

```ts
import PostIt from '@/features/shared/ui/PostIt.vue'
import EventTeaser from '@/features/events/components/EventTeaser.vue'
import CommunityTeaser from '@/features/community/components/CommunityTeaser.vue'

describe('NearbyFeatures', () => {
  it('renders the right teaser component for each kind', () => {
    const items = [
      makeItem('p1', 'post', 'post body'),
      makeItem('e1', 'event', 'event title'),
      makeItem('c1', 'community', 'community title'),
    ]
    const wrapper = mount(NearbyFeatures, { props: { items } })
    expect(wrapper.findComponent(PostIt).exists()).toBe(true)
    expect(wrapper.findComponent(EventTeaser).exists()).toBe(true)
    expect(wrapper.findComponent(CommunityTeaser).exists()).toBe(true)
  })

  it('emits item:select with the full metadata row when a teaser is clicked', async () => {
    const items = [makeItem('p1', 'post', 'hello')]
    const wrapper = mount(NearbyFeatures, { props: { items } })
    await wrapper.find('.user-select-none').trigger('click')
    const emitted = wrapper.emitted('item:select')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ id: 'p1', kind: 'post' })
  })

  it('hides the panel when items is empty', () => {
    const wrapper = mount(NearbyFeatures, { props: { items: [] } })
    expect(wrapper.find('.nearby-features-panel').isVisible()).toBe(false)
  })
})
```

If the existing spec uses different mount helpers (BootstrapVueNext stubs etc.), preserve them.

- [ ] **Step 3: Run the test — it should FAIL because `items` prop and the new teaser components don't exist yet**

Run: `pnpm --filter frontend exec vitest run NearbyFeatures.spec`
Expected: FAIL — typically with "module not found" for `EventTeaser` / `CommunityTeaser`, or a prop validation error.

- [ ] **Step 4: Defer commit** — implementation follows in Tasks 10–11.

---

## Task 10: Frontend — create `EventTeaser` and `CommunityTeaser`

**Files:**

- Create: `apps/frontend/src/features/events/components/EventTeaser.vue`
- Create: `apps/frontend/src/features/community/components/CommunityTeaser.vue`

- [ ] **Step 1: Create `EventTeaser.vue`**

Create `apps/frontend/src/features/events/components/EventTeaser.vue`:

```vue
<script setup lang="ts">
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'

defineProps<{
  item: UserContentMetadata
}>()
</script>

<template>
  <div class="event-teaser p-2 rounded shadow-sm">
    <div class="event-teaser-title text-truncate">{{ item.content }}</div>
    <div class="event-teaser-author text-muted small">
      {{ item.postedBy.publicName }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.event-teaser {
  background-color: var(--bs-event-light);
  cursor: pointer;
  min-width: 0;
  font-size: 0.95rem;
}
.event-teaser-title {
  font-weight: 600;
}
</style>
```

- [ ] **Step 2: Create `CommunityTeaser.vue`**

Create `apps/frontend/src/features/community/components/CommunityTeaser.vue`:

```vue
<script setup lang="ts">
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'

defineProps<{
  item: UserContentMetadata
}>()
</script>

<template>
  <div class="community-teaser p-2 rounded shadow-sm">
    <div class="community-teaser-title text-truncate">{{ item.content }}</div>
    <div class="community-teaser-author text-muted small">
      {{ item.postedBy.publicName }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.community-teaser {
  background-color: var(--bs-community-light);
  cursor: pointer;
  min-width: 0;
  font-size: 0.95rem;
}
.community-teaser-title {
  font-weight: 600;
}
</style>
```

Both teasers reuse the `--bs-event-light` / `--bs-community-light` CSS variables introduced on this branch's parent commits (the same tokens used by `EventCard` / `CommunityCard`).

- [ ] **Step 3: Defer commit** — `NearbyFeatures` consumer changes are in Task 11.

---

## Task 11: Frontend — rewrite `NearbyFeatures.vue` to dispatch by kind

**Files:**

- Modify: `apps/frontend/src/features/browse/components/NearbyFeatures.vue`

- [ ] **Step 1: Replace the `<script setup>` block**

Replace the entire `<script setup lang="ts">` block (lines 1–35) with:

```ts
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'
import PostIt from '@/features/shared/ui/PostIt.vue'
import EventTeaser from '@/features/events/components/EventTeaser.vue'
import CommunityTeaser from '@/features/community/components/CommunityTeaser.vue'
import IconExpand from '@/assets/icons/arrows/chevrons-up.svg'
import IconCollapse from '@/assets/icons/arrows/chevrons-down.svg'

const props = defineProps<{
  items: UserContentMetadata[]
}>()

const emit = defineEmits<{
  (e: 'item:select', item: UserContentMetadata): void
}>()

function handleClick(item: UserContentMetadata) {
  emit('item:select', item)
}

const isExpanded = ref(false)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function onWheel(e: WheelEvent) {
  if (isExpanded.value) return
  if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
  const el = e.currentTarget as HTMLElement
  el.scrollLeft += e.deltaY
  e.preventDefault()
}

const isVisible = computed(() => props.items.length > 0)

const teaserFor = (kind: UserContentMetadata['kind']) => {
  if (kind === 'event') return EventTeaser
  if (kind === 'community') return CommunityTeaser
  return PostIt
}
</script>
```

- [ ] **Step 2: Replace the template's per-item loop**

In `NearbyFeatures.vue`, replace the `<div v-for="post in posts" ...>` block (lines 72–84 in the original) with:

```vue
      <div
        v-for="item in items"
        :key="item.id"
        class="user-select-none col-12 col-sm-6 col-md-4 col-lg-3"
        @click="handleClick(item)"
      >
        <PostIt
          v-if="item.kind === 'post'"
          class="cursor-pointer p-2 post-content"
          :id="item.id"
        >
          {{ item.content.substring(0, 120) }}
        </PostIt>
        <EventTeaser
          v-else-if="item.kind === 'event'"
          :item="item"
        />
        <CommunityTeaser
          v-else-if="item.kind === 'community'"
          :item="item"
        />
      </div>
```

Using explicit `v-if/v-else-if` over `<component :is>` so the post-specific props (`id`, slot content with `.substring`) survive untouched — `<component :is>` would force all three teasers to share a prop contract.

- [ ] **Step 3: Run the component test**

Run: `pnpm --filter frontend exec vitest run NearbyFeatures.spec`
Expected: 3 PASS (Task 9's tests).

- [ ] **Step 4: Defer commit** — `BrowseProfiles` callers still bind old props/events; fix in Task 12.

---

## Task 12: Frontend — update `BrowseProfiles.vue` to bind `feedItems` and dispatch by kind

**Files:**

- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue`
- Modify: `apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts`

- [ ] **Step 1: Remove the `PostSummary` import**

In `BrowseProfiles.vue`, remove line 42:

```ts
import type { PostSummary } from '@zod/post/post.dto'
```

- [ ] **Step 2: Add the metadata type import**

Add (alongside other `@zod/*` imports near the top):

```ts
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'
```

- [ ] **Step 3: Replace `onNearbyPostSelect` with a kind dispatcher**

Replace the existing `onNearbyPostSelect` function (lines 226–234 in the original) with:

```ts
// NearbyFeatures lives outside the map, so picking an item there must move the
// map for context. Map-marker clicks (handleMarkerSelect) and SearchBar's
// post:select don't need this — the marker click is already on-screen, and
// SearchBar emits its own location:set alongside post:select.
function onNearbyItemSelect(item: UserContentMetadata) {
  if (item.location) {
    const point = toGeoPoint(item.location)
    if (point) highlightedLocation.value = [point.lat, point.lon]
  }
  if (item.kind === 'post') handlePostSelect({ id: item.id })
  else if (item.kind === 'event') handleEventSelect({ id: item.id })
  else if (item.kind === 'community') handleCommunitySelect({ id: item.id })
}
```

- [ ] **Step 4: Update the template binding**

In the `<template>`, replace:

```vue
<NearbyFeatures
  :posts="contentStore.postSummaries"
  @post:select="onNearbyPostSelect"
/>
```

with:

```vue
<NearbyFeatures
  :items="contentStore.feedItems"
  @item:select="onNearbyItemSelect"
/>
```

- [ ] **Step 5: Update the `BrowseProfiles.spec.ts` mocks**

In `apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts`:

- Rename `mockPostSummaries` → `mockFeedItems` (lines 125, 206, 297). Also rename the value the getter returns (line 129–130).
- Update the store-mock getter name from `postSummaries` to `feedItems`.
- Update the assertion title `'passes contentStore.postSummaries to NearbyFeatures'` to `'passes contentStore.feedItems to NearbyFeatures'` (line 296).
- Update fixture shapes to `UserContentMetadata` instead of `PostSummary` (line 297 fixture content).
- Update the asserted prop name on `NearbyFeatures` from `posts` to `items`.

If a kind-dispatch integration test isn't already covered, add one at the end of the file:

```ts
  it('navigates by kind when an item is selected from NearbyFeatures', async () => {
    mockFeedItems.value = [
      { id: 'e1', kind: 'event', content: 't', postedBy: { id: 'p', publicName: 'P', profileImages: [] }, createdAt: new Date(), isOwn: false, location: undefined },
    ]
    const wrapper = mountBrowseProfiles() // use the helper already in the file
    await wrapper.findComponent({ name: 'NearbyFeatures' }).vm.$emit('item:select', mockFeedItems.value[0])
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'PublicEvent', params: { eventId: 'e1' } })
  })
```

(Match the existing test's router-mock conventions; the spec already mocks `router.push` for other navigation assertions.)

- [ ] **Step 6: Run the affected test files**

Run: `pnpm --filter frontend exec vitest run BrowseProfiles.spec userContentStore.spec useBrowseViewModel.spec NearbyFeatures.spec`
Expected: all PASS.

- [ ] **Step 7: Run type-check across frontend**

Run: `pnpm --filter frontend exec vue-tsc --noEmit -p tsconfig.json 2>&1 | tail -20`
Expected: no errors.

- [ ] **Step 8: Format the touched files**

Run:

```bash
pnpm exec prettier --write \
  apps/backend/src/services/userContent.service.ts \
  apps/backend/src/api/routes/content.route.ts \
  apps/backend/src/api/routes/content/post.route.ts \
  apps/backend/src/services/post.service.ts \
  apps/backend/src/__tests__/routes/content/post.route.spec.ts \
  apps/backend/src/__tests__/routes/content/contentRoutes.bounds.spec.ts \
  packages/shared/zod/apiResponse.dto.ts \
  apps/frontend/src/features/userContent/stores/userContentStore.ts \
  apps/frontend/src/features/userContent/stores/__tests__/userContentStore.spec.ts \
  apps/frontend/src/features/browse/composables/useBrowseViewModel.ts \
  apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.spec.ts \
  apps/frontend/src/features/browse/components/NearbyFeatures.vue \
  apps/frontend/src/features/browse/components/__tests__/NearbyFeatures.spec.ts \
  apps/frontend/src/features/browse/views/BrowseProfiles.vue \
  apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts \
  apps/frontend/src/features/events/components/EventTeaser.vue \
  apps/frontend/src/features/community/components/CommunityTeaser.vue
```

- [ ] **Step 9: Commit the frontend rewrite as one logical change**

```bash
git add packages/shared/zod/apiResponse.dto.ts \
        apps/frontend/src/features/userContent/stores/userContentStore.ts \
        apps/frontend/src/features/userContent/stores/__tests__/userContentStore.spec.ts \
        apps/frontend/src/features/browse/composables/useBrowseViewModel.ts \
        apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.spec.ts \
        apps/frontend/src/features/browse/components/NearbyFeatures.vue \
        apps/frontend/src/features/browse/components/__tests__/NearbyFeatures.spec.ts \
        apps/frontend/src/features/browse/views/BrowseProfiles.vue \
        apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts \
        apps/frontend/src/features/events/components/EventTeaser.vue \
        apps/frontend/src/features/community/components/CommunityTeaser.vue
git commit -m "feat(browse): unify NearbyFeatures over /content/bounds (mixed-kind teasers)"
```

This single commit captures the entire frontend rewrite: store rename, view-model wiring, component dispatch, new teasers, and all updated tests. The shared `PostSummariesResponse` deletion rides along because it's the same logical change.

---

## Task 13: Full verification

- [ ] **Step 1: Run the entire frontend test suite**

Run: `pnpm --filter frontend test`
Expected: all PASS.

- [ ] **Step 2: Run the entire backend test suite**

Run: `pnpm --filter backend test`
Expected: all PASS.

- [ ] **Step 3: Run type-check across the workspace**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Manual smoke test in browser**

Run `pnpm dev` and:

1. Open `https://localhost:5173/home`, log in as `me@example.org`.
2. Navigate to `/browse`.
3. Pan the map over an area with seeded posts, events, and communities.
4. Verify the bottom `NearbyFeatures` strip shows all three kinds, sorted newest first.
5. Click a post teaser → routes to `PublicPost`. Click an event teaser → routes to `PublicEvent`. Click a community teaser → routes to `PublicCommunity`.
6. Verify the map recenters to the item's location on each click.
7. Verify the strip empties when panning to an area with no content.

- [ ] **Step 5: Write a changeset**

Per CLAUDE.md, every PR touching a service requires a changeset. Create `.changeset/<adjective-noun-verb>.md`:

```bash
cat > .changeset/unified-feed-bounds.md << 'EOF'
---
'@opencupid/frontend': minor
'@opencupid/backend': minor
---

NearbyFeatures now shows mixed posts, events, and communities from the viewport in one strip. The `/content/posts/bounds` endpoint is removed; the unified `/content/bounds` endpoint (already shipped) is now the single source.
EOF
git add .changeset/unified-feed-bounds.md
git commit -m "chore: add changeset for unified-nearby-feed"
```

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin feat/unified-nearby-feed
gh pr create --title "feat(browse): unify NearbyFeatures over /content/bounds" --body "$(cat <<'EOF'
## Summary
- Frontend now consumes the existing kind-neutral `/content/bounds` endpoint instead of the post-only `/content/posts/bounds` shim.
- `NearbyFeatures` renders posts, events, and communities in one strip, sorted by recency, dispatched to per-kind teasers.
- Backend `UserContentService.findInBounds` gains a 50-item cap and `createdAt desc, id asc` ordering.
- Removes `/content/posts/bounds`, `PostService.findInBoundsHydrated`, and `PostSummariesResponse`.

## Test plan
- [ ] `pnpm test` green
- [ ] `pnpm type-check` green
- [ ] Manual: pan map over dense area → strip shows mixed kinds, newest first
- [ ] Manual: click each kind in strip → routes to correct detail view + recenters

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

**Spec coverage:** every section of the spec maps to a task — service change (Task 1), route wiring (Task 2), route tests (Task 3), deletion sweep (Task 4), DTO cleanup (Task 5), store rename (Tasks 6–7), view-model wiring (Task 8), component tests + new teasers + dispatch (Tasks 9–11), view integration (Task 12), verification + ship (Task 13).

**Placeholder scan:** no TBDs; conditional deletions (`PostSummary`, `attachPostContent`) carry an explicit "verify with grep first" gate based on the pre-flight findings.

**Type consistency:** `feedItems`, `fetchFeedInBounds`, `item:select`, `UserContentMetadata`, `UserContentMetadataArraySchema` used uniformly across Tasks 6–12. Backend uses `findInBounds(box, { limit })` everywhere.

**Spec divergence noted:** the original spec listed `PostSummarySchema` deletion as conditional — the pre-flight grep proved it's still needed by `search.route.ts` / `SearchBar.vue`. Plan keeps it, only removes `PostSummariesResponse`. No re-spec needed; risk section called out the verify-first gate.
