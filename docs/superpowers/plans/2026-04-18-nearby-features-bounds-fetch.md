# NearbyFeatures bounds-fetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Feed `NearbyFeatures` with a complete list of posts in the current map viewport via `/posts/bounds`, so clustered posts no longer go missing from the strip.

**Architecture:** Change `/posts/bounds` to return `PostSummary[]` (a new `PostSummariesResponse` type). On the frontend, `postStore` gets a new `postSummaries` state, `useBrowseViewModel.onBoundsChanged` fetches bounds-posts in parallel with cluster features, and `postPois` is re-derived from `postStore.postSummaries` instead of cluster features. Map markers continue to use cluster-aggregated data.

**Tech Stack:** Fastify + Prisma (backend), Vue 3 + Pinia + TypeScript (frontend), Vitest

**Spec:** `docs/superpowers/specs/2026-04-18-nearby-features-bounds-fetch-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/shared/zod/apiResponse.dto.ts` | Add `PostSummariesResponse` type |
| Modify | `apps/backend/src/api/routes/post.route.ts` | Change `/bounds` to return `PostSummary[]` |
| Modify | `apps/backend/src/__tests__/routes/post.route.spec.ts` | Add `/bounds` route test asserting new shape |
| Modify | `apps/frontend/src/features/posts/stores/postStore.ts` | Add `postSummaries` state; re-type `fetchPostsInBounds` |
| Modify | `apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts` | Cover new parse and state write |
| Modify | `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts` | Derive `postPois` from `postSummaries`; parallel fetch |
| Modify | `apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.spec.ts` | Cover new behaviour |
| Delete | `apps/frontend/src/features/posts/composables/usePostsViewModel.ts` | Dead code — orphaned composable |
| Delete | `apps/frontend/src/features/posts/composables/__tests__/usePostsViewModel.spec.ts` | Tests for the deleted composable |
| Create | `.changeset/*.md` | Changeset entry (CLAUDE.md HARD RULE) |

---

### Task 1: Add `PostSummariesResponse` API type

**Files:**
- Modify: `packages/shared/zod/apiResponse.dto.ts:31` (import block), and append new response type

- [ ] **Step 1: Update the post-type import to include `PostSummary`**

Change the import at line 31 from:

```ts
import type { OwnerPost, PublicPostWithProfile, PublicPostDetail } from '@zod/post/post.dto'
```

To:

```ts
import type {
  OwnerPost,
  PublicPostWithProfile,
  PublicPostDetail,
  PostSummary,
} from '@zod/post/post.dto'
```

- [ ] **Step 2: Add the `PostSummariesResponse` type**

After the existing `PostsResponse` line (around line 93), add:

```ts
export type PostSummariesResponse = ApiSuccess<{ posts: PostSummary[] }>
```

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/zod/apiResponse.dto.ts
git commit -m "feat(api): add PostSummariesResponse type"
```

---

### Task 2: Change `/posts/bounds` to return `PostSummary[]`

**Files:**
- Modify: `apps/backend/src/api/routes/post.route.ts` (imports + `/bounds` handler)

- [ ] **Step 1: Update imports**

At the top of the file (around lines 1-20), ensure these imports exist — add `PostSummariesResponse` if missing:

```ts
import type { PostsResponse, PostSummariesResponse } from '@zod/apiResponse.dto'
```

Replace the `mapDbPostToPublic` import with (or alongside) `mapPostSummary`:

```ts
import { mapDbPostToPublic, mapPostSummary } from '@/api/mappers/post.mappers'
```

(Keep `mapDbPostToPublic` — other handlers in this file still use it.)

- [ ] **Step 2: Update the `/bounds` handler**

Locate the handler at `apps/backend/src/api/routes/post.route.ts:233-253`. Replace its body:

```ts
fastify.get('/bounds', { onRequest: [fastify.authenticate] }, async (req, reply) => {
  const parsed = BoundsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return sendError(
      reply,
      400,
      'Missing or invalid bounds parameters (south, north, west, east)'
    )
  }

  try {
    const raw = await postService.findInBounds(parsed.data)
    const posts = raw.map((post) => mapPostSummary(post))

    const response: PostSummariesResponse = { success: true, posts }
    return reply.code(200).send(response)
  } catch (err) {
    fastify.log.error(err)
    return sendError(reply, 500, 'Failed to fetch posts in bounds')
  }
})
```

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

Expected: No errors. (The Prisma payload returned by `findInBounds` already satisfies `DbPostForSummary` because it uses `postedByInclude`; `mapPostSummary` accepts it.)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/api/routes/post.route.ts
git commit -m "feat(api): /posts/bounds returns PostSummary[]"
```

---

### Task 3: Add route test for `/posts/bounds`

**Files:**
- Modify: `apps/backend/src/__tests__/routes/post.route.spec.ts` (append new describe block)

- [ ] **Step 1: Write the failing test**

Append at the end of the outer `describe` block (before its closing `})`):

```ts
describe('GET /posts/bounds', () => {
  it('returns PostSummary[] inside the viewport', async () => {
    const me = await makeProfile()
    const other = await makeProfile()
    const inside = await prisma.post.create({
      data: {
        content: 'inside post',
        type: 'OFFER',
        country: 'HU',
        cityName: 'Budapest',
        lat: 47.5,
        lon: 19.0,
        postedById: other.id,
      },
    })
    await prisma.post.create({
      data: {
        content: 'outside post',
        type: 'OFFER',
        country: 'FR',
        cityName: 'Paris',
        lat: 48.85,
        lon: 2.35,
        postedById: other.id,
      },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/posts/bounds?south=47&north=48&west=18&east=20',
      cookies: { sid: await signSession(me.id) },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.posts).toHaveLength(1)
    const p = body.posts[0]
    expect(p.id).toBe(inside.id)
    // PostSummary shape — no isOwn, no conversationContext, no isVisible
    expect(p).toHaveProperty('type')
    expect(p).toHaveProperty('content')
    expect(p).toHaveProperty('location')
    expect(p).toHaveProperty('postedBy')
    expect(p).not.toHaveProperty('isOwn')
    expect(p).not.toHaveProperty('conversationContext')
    expect(p).not.toHaveProperty('isVisible')
  })

  it('returns 400 for invalid bounds', async () => {
    const me = await makeProfile()
    const res = await app.inject({
      method: 'GET',
      url: '/api/posts/bounds?south=foo',
      cookies: { sid: await signSession(me.id) },
    })
    expect(res.statusCode).toBe(400)
  })
})
```

**Helper check:** This test assumes `makeProfile` and `signSession` helpers exist in the test file. If the existing test file uses different helpers (check imports at top of `post.route.spec.ts`), adapt to match the local patterns. Run the existing test suite first to confirm helper names.

- [ ] **Step 2: Run the test to confirm it passes**

```bash
pnpm --filter backend exec vitest run -t "GET /posts/bounds"
```

Expected: Both tests pass (Task 2 already implemented the handler).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/__tests__/routes/post.route.spec.ts
git commit -m "test(api): cover /posts/bounds response shape"
```

---

### Task 4: Update `postStore.fetchPostsInBounds` to parse `PostSummary[]`

**Files:**
- Modify: `apps/frontend/src/features/posts/stores/postStore.ts`

- [ ] **Step 1: Update imports**

Change the import block at the top of the file:

```ts
import {
  PublicPostWithProfileSchema,
  PublicPostDetailSchema,
  OwnerPostSchema,
  PostSummarySchema,
  type PublicPostWithProfile,
  type PublicPostDetail,
  type OwnerPost,
  type PostSummary,
  type CreatePostPayload,
  type UpdatePostPayload,
  type PostQueryInput,
  type NearbyPostQueryInput,
  type PostScope,
} from '@zod/post/post.dto'
```

And update the response-type imports:

```ts
import type {
  PostsResponse,
  PostSummariesResponse,
  MyPostsResponse,
  PostResponse,
  PublicPostDetailResponse,
  CreatePostResponse,
  UpdatePostResponse,
  DeletePostResponse,
} from '@zod/apiResponse.dto'
```

- [ ] **Step 2: Add `postSummaries` state and response type alias**

Near the existing array schema constants (around line 30-36), add:

```ts
const PostSummaryArraySchema = PostSummarySchema.array()
type StorePostSummariesResponse = StoreResponse<{ posts: PostSummary[] }>
```

Update the store `state` factory (around line 38):

```ts
state: () => ({
  posts: [] as PublicPostWithProfile[],
  myPosts: [] as OwnerPost[],
  postSummaries: [] as PostSummary[],
  currentPost: null as PublicPostWithProfile | OwnerPost | null,
}),
```

- [ ] **Step 3: Replace `fetchPostsInBounds`**

Find the existing action at `postStore.ts:266-277`. Replace with:

```ts
async fetchPostsInBounds(bounds: MapBounds): Promise<StorePostSummariesResponse> {
  try {
    const res = await safeApiCall(() =>
      api.get<PostSummariesResponse>('/posts/bounds', { params: bounds })
    )
    const posts = PostSummaryArraySchema.parse(res.data.posts)
    this.postSummaries = posts
    return storeSuccess({ posts })
  } catch (error: any) {
    return storeError(error, 'Failed to fetch posts in bounds')
  }
},
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter frontend type-check
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/posts/stores/postStore.ts
git commit -m "feat(posts): fetchPostsInBounds returns PostSummary[] into postSummaries"
```

---

### Task 5: Update `postStore.spec.ts`

**Files:**
- Modify: `apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts`

- [ ] **Step 1: Read the existing spec to understand its mock pattern**

```bash
cat apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts | head -60
```

Identify how existing actions are tested — typically mocking `api.get` via `vi.mock('@/lib/api', ...)`. Follow the same mock pattern.

- [ ] **Step 2: Append a test for `fetchPostsInBounds`**

Add to the existing `describe('usePostStore', …)` block:

```ts
describe('fetchPostsInBounds', () => {
  it('parses response into postSummaries state', async () => {
    const fakePosts = [
      {
        id: 'post-1',
        type: 'OFFER',
        content: 'Hello',
        location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
        postedBy: {
          id: 'p1',
          publicName: 'Alice',
          profileImages: [],
          location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
        },
      },
    ]
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, posts: fakePosts },
    } as any)

    const store = usePostStore()
    const result = await store.fetchPostsInBounds({
      south: 47, north: 48, west: 18, east: 20,
    })

    expect(result.success).toBe(true)
    expect(store.postSummaries).toHaveLength(1)
    expect(store.postSummaries[0]!.id).toBe('post-1')
    expect(api.get).toHaveBeenCalledWith('/posts/bounds', {
      params: { south: 47, north: 48, west: 18, east: 20 },
    })
  })

  it('returns error on request failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('network'))
    const store = usePostStore()
    const result = await store.fetchPostsInBounds({
      south: 0, north: 0, west: 0, east: 0,
    })
    expect(result.success).toBe(false)
  })
})
```

Add imports if missing at top of file: `import { api } from '@/lib/api'` and `import { usePostStore } from '../postStore'`.

- [ ] **Step 3: Run the test**

```bash
pnpm --filter frontend exec vitest run -t "fetchPostsInBounds"
```

Expected: Both new tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/posts/stores/__tests__/postStore.spec.ts
git commit -m "test(posts): cover fetchPostsInBounds PostSummary parsing"
```

---

### Task 6: Update `useBrowseViewModel` to derive `postPois` from `postSummaries` and parallel-fetch

**Files:**
- Modify: `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts`

- [ ] **Step 1: Update imports**

Replace the existing imports block with:

```ts
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { MapCluster, MapPoi, BoundsWithZoom } from '@/features/map/types/map.types'
import type { ClusterFeature, PointFeature } from '@shared/zod/map/cluster.dto'
import type { PostSummary } from '@zod/post/post.dto'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { usePostStore } from '@/features/posts/stores/postStore'
```

- [ ] **Step 2: Wire `postStore` and replace the `postPois` computed**

Inside `useBrowseViewModel()`, just after `const ownerStore = useOwnerProfileStore()`, add:

```ts
const postStore = usePostStore()
const { postSummaries } = storeToRefs(postStore)
```

Replace the existing `postPois` computed (currently at lines 49-62) with:

```ts
const postPois = computed<MapPoi[]>(() =>
  postSummaries.value
    .filter(
      (p): p is PostSummary & { location: { lat: number; lon: number } } =>
        p.location?.lat != null && p.location?.lon != null
    )
    .map((p) => ({
      id: p.id,
      title: p.content,
      location: { lat: p.location.lat, lon: p.location.lon },
      type: 'post',
      source: p,
    }))
)
```

- [ ] **Step 3: Update `onBoundsChanged` to parallel-fetch**

Replace the existing `onBoundsChanged` (currently at lines 88-90):

```ts
async function onBoundsChanged({ bounds, zoom }: BoundsWithZoom) {
  await Promise.all([
    findProfileStore.fetchBounds(bounds, zoom),
    postStore.fetchPostsInBounds(bounds),
  ])
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter frontend type-check
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/browse/composables/useBrowseViewModel.ts
git commit -m "feat(browse): derive postPois from postStore.postSummaries; parallel bounds fetch"
```

---

### Task 7: Update `useBrowseViewModel.spec.ts`

**Files:**
- Modify: `apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.spec.ts`

- [ ] **Step 1: Inspect the existing spec**

```bash
cat apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.spec.ts
```

Note the existing mock setup for `useFindProfileStore` and `useOwnerProfileStore`. We add a parallel mock for `usePostStore`.

- [ ] **Step 2: Add the `usePostStore` mock and parallel-fetch test**

Near the top of the file, add the mock:

```ts
const fetchPostsInBounds = vi.fn().mockResolvedValue({ success: true })
const postSummaries = ref<any[]>([])
vi.mock('@/features/posts/stores/postStore', () => ({
  usePostStore: () => ({ fetchPostsInBounds, postSummaries }),
}))
```

Add a new `describe` block at the end of the file's existing tests:

```ts
describe('onBoundsChanged', () => {
  it('fetches cluster features and bounds posts in parallel', async () => {
    const { onBoundsChanged } = useBrowseViewModel()
    await onBoundsChanged({
      bounds: { south: 47, north: 48, west: 18, east: 20 },
      zoom: 7,
    })
    expect(findProfileStore.fetchBounds).toHaveBeenCalledWith(
      { south: 47, north: 48, west: 18, east: 20 },
      7
    )
    expect(fetchPostsInBounds).toHaveBeenCalledWith({
      south: 47, north: 48, west: 18, east: 20,
    })
  })
})

describe('postPois', () => {
  it('derives from postStore.postSummaries (not cluster features)', () => {
    postSummaries.value = [
      {
        id: 'post-1',
        type: 'OFFER',
        content: 'Hello',
        location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.0 },
        postedBy: { id: 'p1', publicName: 'Alice' },
      },
    ]
    const { postPois } = useBrowseViewModel()
    expect(postPois.value).toHaveLength(1)
    expect(postPois.value[0]!.id).toBe('post-1')
    expect(postPois.value[0]!.title).toBe('Hello')
    expect(postPois.value[0]!.source).toEqual(postSummaries.value[0])
  })

  it('filters out posts without lat/lon', () => {
    postSummaries.value = [
      {
        id: 'post-nolatlon',
        type: 'OFFER',
        content: 'No coords',
        location: { country: 'HU' },
        postedBy: { id: 'p1', publicName: 'Alice' },
      },
    ]
    const { postPois } = useBrowseViewModel()
    expect(postPois.value).toHaveLength(0)
  })
})
```

Depending on the existing test's mock scope, you may need to declare `findProfileStore.fetchBounds` as an accessible vi.fn at the top of the file to satisfy the first assertion. Match the existing pattern for `useFindProfileStore`.

- [ ] **Step 3: Run the spec**

```bash
pnpm --filter frontend exec vitest run useBrowseViewModel.spec
```

Expected: All tests pass (existing + 3 new).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/browse/composables/__tests__/useBrowseViewModel.spec.ts
git commit -m "test(browse): cover postPois from postSummaries and parallel fetch"
```

---

### Task 8: Delete dead `usePostsViewModel` composable and its spec

**Files:**
- Delete: `apps/frontend/src/features/posts/composables/usePostsViewModel.ts`
- Delete: `apps/frontend/src/features/posts/composables/__tests__/usePostsViewModel.spec.ts`

- [ ] **Step 1: Confirm no production consumer exists**

```bash
grep -rn "usePostsViewModel" apps/frontend/src --include="*.ts" --include="*.vue" | grep -v spec | grep -v "composables/usePostsViewModel.ts"
```

Expected: no output (composable is orphaned).

- [ ] **Step 2: Delete the files**

```bash
git rm apps/frontend/src/features/posts/composables/usePostsViewModel.ts
git rm apps/frontend/src/features/posts/composables/__tests__/usePostsViewModel.spec.ts
```

- [ ] **Step 3: Run lint + type-check to confirm no dangling references**

```bash
pnpm lint
pnpm --filter frontend type-check
```

Expected: Both pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove dead usePostsViewModel composable"
```

---

### Task 9: Add changeset

**Files:**
- Create: `.changeset/<adjective-noun-verb>.md`

- [ ] **Step 1: Write the changeset**

```bash
cat > .changeset/nearby-bounds-fetch.md << 'EOF'
---
'@opencupid/frontend': minor
'@opencupid/backend': minor
---

NearbyFeatures strip now fetches posts directly from `/posts/bounds` so clustered posts are no longer hidden from the panel. The `/posts/bounds` response shape changed from `PublicPostWithProfile[]` to the lighter `PostSummary[]` (matches what the strip needs; no existing production consumer relied on the richer shape).
EOF
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/nearby-bounds-fetch.md
git commit -m "chore: add changeset for nearby-features bounds fetch"
```

---

### Task 10: Full verification

- [ ] **Step 1: Full frontend test suite**

```bash
pnpm --filter frontend test
```

Expected: All tests pass.

- [ ] **Step 2: Full backend test suite**

```bash
pnpm --filter backend test
```

Expected: All tests pass.

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

Expected: No errors.

- [ ] **Step 4: Lint**

```bash
pnpm lint
```

Expected: No errors.

- [ ] **Step 5: Manual smoke test**

Start the dev stack (`pnpm dev`), open `https://localhost:5173/home`:

- Pan/zoom to an area where post markers are clustered (numeric cluster circles visible).
- Verify the `NearbyFeatures` strip at the bottom shows post-it cards for posts that are inside the viewport bounds but hidden behind cluster markers.
- Zoom in until clusters break apart; same posts remain in the strip and now appear as markers.
- Zoom out to an empty ocean area; strip hides (no posts in bounds).
- Click a post card; route navigates to `PublicPost` as before.
