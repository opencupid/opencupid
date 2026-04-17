# NearbyFeatures bounds-fetch — Design Spec

## Problem

`NearbyFeatures` misses clustered posts. Its data source is `useBrowseViewModel.postPois`, which is derived from `findProfileStore.clusterFeatures` (backed by `/find/clusters`). Supercluster aggregates nearby posts into numeric cluster markers at lower zoom levels; clustered posts never appear as `PointFeature` entries, so the strip only surfaces posts that happen to be un-clustered at the current zoom.

## Goal

Feed `NearbyFeatures` with a complete list of posts inside the current map viewport, independent of cluster aggregation.

## Approach

Use the existing `/posts/bounds` endpoint, which returns posts inside a bounding box without any clustering pass. Swap its response shape from `PublicPostWithProfile[]` to `PostSummary[]` — NearbyFeatures only needs teaser-card fields (id, type, content, location, postedBy). The endpoint currently has no production consumer; the one referencing composable (`usePostsViewModel`) is dead code from an earlier refactor.

## Data flow

```
bounds:changed (OsmPoiMap, debounced 500ms)
  ├─► findProfileStore.fetchBounds()      → clusterFeatures → map markers
  └─► postStore.fetchPostsInBounds()      → postSummaries   → NearbyFeatures strip
```

Map markers continue to use cluster aggregation (clustering is a rendering concern — unclustering marker-heavy viewports would degrade map UX). The list strip uses the un-clustered bounds fetch (users want to see every post, not cluster counts, in a feed-like strip).

## Backend changes

### 1. New response type

**File:** `packages/shared/zod/apiResponse.dto.ts`

Add a `PostSummariesResponse` type matching the existing pattern (`PostsResponse`, `MyPostsResponse`):

```ts
export type PostSummariesResponse = {
  success: true
  posts: PostSummary[]
}
```

### 2. Change `/posts/bounds` response shape

**File:** `apps/backend/src/api/routes/post.route.ts:233-253`

- Replace `mapDbPostToPublic` with `mapPostSummary`
- Response type shifts from `PostsResponse` → `PostSummariesResponse`
- Route logic otherwise unchanged

Existing `postService.findInBounds` already returns the Prisma payload `mapPostSummary` expects (same `postedByInclude` shape). No service-layer changes.

### 3. Update route test

**File:** `apps/backend/src/__tests__/routes/post.route.spec.ts`

Tests that hit `/bounds` and assert on the response shape must be updated to expect `PostSummary` fields, not `PublicPostWithProfile` fields.

## Frontend changes

### 1. `postStore`

**File:** `apps/frontend/src/features/posts/stores/postStore.ts`

- Add state: `postSummaries: PostSummary[]` (separate from existing `posts: PublicPostWithProfile[]`)
- Change `fetchPostsInBounds(bounds)`:
  - Return type: `StoreResponse<{ posts: PostSummary[] }>`
  - Response parser: `PostSummarySchema.array()` instead of `PublicPostWithProfileArraySchema`
  - Write to `this.postSummaries` instead of `this.posts`
- Update store test accordingly

### 2. `useBrowseViewModel`

**File:** `apps/frontend/src/features/browse/composables/useBrowseViewModel.ts`

Two changes:

**Re-derive `postPois` from `postStore.postSummaries`:**

```ts
const postStore = usePostStore()
const { postSummaries } = storeToRefs(postStore)

const postPois = computed<MapPoi[]>(() =>
  postSummaries.value
    .filter((p): p is PostSummary & { location: { lat: number; lon: number } } =>
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

**Parallel-fetch in `onBoundsChanged`:**

```ts
async function onBoundsChanged({ bounds, zoom }: BoundsWithZoom) {
  await Promise.all([
    findProfileStore.fetchBounds(bounds, zoom),
    postStore.fetchPostsInBounds(bounds),
  ])
}
```

Update `useBrowseViewModel.spec.ts` to cover both new behaviours.

### 3. Dead code cleanup

Delete:
- `apps/frontend/src/features/posts/composables/usePostsViewModel.ts`
- `apps/frontend/src/features/posts/composables/__tests__/usePostsViewModel.spec.ts`

Verified by grep: nothing outside its own spec imports this composable.

## What this does NOT change

- `BrowseProfiles.vue` template (contract at `postPois` prop boundary unchanged)
- `NearbyFeatures.vue` (receives `MapPoi[]` same as before)
- Map markers — still derived from cluster data, still cluster-aggregated
- `handlePostSelect` — signature unchanged. Previously `poi.source` was cast from `PointFeature as PostSummary` (unsafe but worked because both share `id`); now `poi.source` *is* a real `PostSummary`. The existing cast at call site remains valid (MapPoi.source is typed `unknown`).
- `postStore.posts` / `postStore.myPosts` — separate fields, untouched

## Test plan

**Backend:**
- `/posts/bounds` route spec: response shape matches `PostSummariesResponse`
- Invalid bounds still return 400 (no change in error path)

**Frontend:**
- `postStore.fetchPostsInBounds`: parses `PostSummary[]`, writes to `postSummaries`
- `useBrowseViewModel.onBoundsChanged`: calls both stores in parallel
- `useBrowseViewModel.postPois`: derives from `postStore.postSummaries`
- `BrowseProfiles.spec` and `NearbyFeatures.spec`: unchanged (same external contract)

**Manual verification:**
- Pan map over area with clustered posts at low zoom → strip shows all posts in bounds
- Zoom in until clusters break apart → same posts still in strip, plus now visible as markers
- Zoom out to empty ocean → strip hides (empty array)
