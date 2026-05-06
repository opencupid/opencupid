# Map layer server-side filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move map layer filtering (people / posts) from a planned client-side filter to a server-side filter applied at supercluster index-build time, exposed via a new required `kinds` query parameter and surfaced in a `<MapLayerControl>` button-toggle group.

**Architecture:** Single combined supercluster index per `(profileId, tagIds, kinds)` tuple. The cache key gains a sorted `|kinds` segment; `buildIndex` skips DB queries for omitted kinds; the frontend store reads layer selection from `mapStore` at fetch time and a watcher in `BrowseProfiles.vue` triggers `refetchBounds` on toggle.

**Tech Stack:** Vue 3 (`<script setup>`), Pinia, Bootstrap-Vue-Next (`BButtonGroup`, `BButton`), Vitest, Fastify, Zod, Supercluster.

**Spec:** `docs/superpowers/specs/2026-05-06-map-layer-server-filter-design.md`

**Working branch:** `feat/map-layer-server-filter` (already created off `main`).

---

## File Structure

| File | Status | Responsibility |
|------|--------|---------------|
| `packages/shared/maps.ts` | modify | Add `MAP_LAYER_KINDS`, `MapLayerKind`. |
| `packages/shared/zod/map/cluster.dto.ts` | modify | Use `MAP_LAYER_KINDS` in `PointFeatureSchema.kind`; add `KindsSchema`. |
| `apps/backend/src/services/cluster.service.ts` | modify | Add `kinds` to all public methods; cache key gains `|kinds`; `buildIndex` skips queries for omitted kinds; `evict` matches the new separator. |
| `apps/backend/src/__tests__/services/cluster.service.spec.ts` | modify | Update all call sites to pass `kinds`; add new coverage. |
| `apps/backend/src/api/routes/findProfile.route.ts` | modify | Extend route schemas with `kinds`, thread through to service. |
| `apps/backend/src/__tests__/routes/findProfile.cluster.route.spec.ts` | modify | Update assertions for new arg shape; add `kinds` cases. |
| `apps/frontend/src/features/map/stores/mapStore.ts` | modify | Update doc comment to describe present (server-side filter) behaviour. |
| `apps/frontend/src/features/map/components/MapLayerControl.vue` | rewrite | Replace checkboxes with `<BButtonGroup>` + `<BButton :pressed>`. Enforce "at least one selected" invariant. |
| `apps/frontend/src/features/map/components/__tests__/MapLayerControl.spec.ts` | rewrite | Test button-group behaviour, invariant, store sync. |
| `apps/frontend/src/tests/setup.ts` | modify | Add `BButtonGroup` to BVN test globals. |
| `apps/frontend/src/features/browse/stores/findProfileStore.ts` | modify | Add `kinds` signature/param helpers; thread through fetch and cache; reset cache on layer toggle. |
| `apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts` | modify | Assert `kinds` param on the wire; add cache-invalidation coverage. |
| `apps/frontend/src/features/browse/views/BrowseProfiles.vue` | modify | Mount `<MapLayerControl>`; watch `showPeople`/`showPosts` and call `refetchBounds`. |
| `apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts` | modify | Test toggle reactor calls `refetchBounds`. |
| `packages/shared/i18n/en.json` | modify | Add `map.layer_control.{people,posts,aria_label}`. |
| `.changeset/<adjective-noun-verb>.md` | create | Minor bump for `@opencupid/frontend` and `@opencupid/backend`. |

---

## Pre-flight check

- [ ] **Verify branch.** Confirm current branch is `feat/map-layer-server-filter`.

  Run: `git -C /home/user/opencupid branch --show-current`
  Expected: `feat/map-layer-server-filter`

  If on `main`: `git checkout -b feat/map-layer-server-filter` (the spec commit is already on `feat/map-layer-server-filter`; if you're on a fresh clone, fetch the branch first).

---

## Task 1: Shared `MAP_LAYER_KINDS` constant

**Files:**
- Modify: `packages/shared/maps.ts`

- [ ] **Step 1: Add constant + type to `packages/shared/maps.ts`**

Append to the end of the file:

```ts
/**
 * Discriminator values for the points clustered on the social map. Used by
 * the wire-level `kinds` filter, the supercluster point properties, and the
 * `<MapLayerControl>` button group.
 */
export const MAP_LAYER_KINDS = ['profile', 'post'] as const
export type MapLayerKind = (typeof MAP_LAYER_KINDS)[number]
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @opencupid/shared exec tsc --noEmit -p .` (or `pnpm type-check` if the shared package has no standalone tsconfig)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/maps.ts
git commit -m "feat(shared): add MAP_LAYER_KINDS constant"
```

---

## Task 2: Wire schemas — `PointFeature.kind` reuse + new `KindsSchema`

**Files:**
- Modify: `packages/shared/zod/map/cluster.dto.ts`

- [ ] **Step 1: Update imports and `PointFeatureSchema.kind`**

Replace the top of `packages/shared/zod/map/cluster.dto.ts` so the discriminator references the shared tuple:

```ts
import { z } from 'zod'
import { PublicTagSchema } from '../tag/tag.dto'
import { MAP_LAYER_KINDS } from '../../maps'
```

Then change `PointFeatureSchema`'s `kind` field from `z.enum(['profile', 'post'])` to `z.enum(MAP_LAYER_KINDS)`:

```ts
export const PointFeatureSchema = z.object({
  type: z.literal('point'),
  kind: z.enum(MAP_LAYER_KINDS),
  id: z.string(),
  // ...rest unchanged
})
```

- [ ] **Step 2: Append `KindsSchema` to the same file**

Add at the bottom (after the response schema):

```ts
/**
 * Parses a comma-separated `kinds` query param into a deduped, sorted array
 * of `MapLayerKind` values. Empty input is rejected by `.min(1)` — callers
 * must explicitly select at least one layer. Mirrors the parser style used
 * for `tagIds` in `findProfile.route.ts`.
 */
export const KindsSchema = z
  .string()
  .default('')
  .transform((raw) => [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ])
  .pipe(z.array(z.enum(MAP_LAYER_KINDS)).min(1).max(MAP_LAYER_KINDS.length))
```

- [ ] **Step 3: Run shared package type-check**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/zod/map/cluster.dto.ts
git commit -m "feat(shared): add KindsSchema for layer filtering"
```

---

## Task 3 — `ClusterService` cache key + signatures (TDD)

This task changes the public surface of `ClusterService`. Tests come first; existing tests will need their call sites updated as part of this task.

**Files:**
- Modify: `apps/backend/src/services/cluster.service.ts`
- Modify: `apps/backend/src/__tests__/services/cluster.service.spec.ts`

- [ ] **Step 1: Add a failing test for kinds-based cache fragmentation**

Append this `describe` block inside `describe('ClusterService', () => { ... })` in `cluster.service.spec.ts` (alongside the existing `describe('buildIndex', ...)`):

```ts
describe('layer kinds', () => {
  it('builds a separate cache entry for each kinds selection', async () => {
    mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
    mockFindMutualMatchIds.mockResolvedValue([])
    mockFindAllWithLocation.mockResolvedValue([])

    await service.buildIndex('viewer-1', [], ['profile'])
    await service.buildIndex('viewer-1', [], ['profile', 'post'])

    expect(service.hasIndex('viewer-1', [], ['profile'])).toBe(true)
    expect(service.hasIndex('viewer-1', [], ['profile', 'post'])).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test — expect a TypeScript / runtime failure**

Run: `pnpm --filter backend exec vitest run -t "layer kinds"`
Expected: FAIL — TypeScript reports too many arguments OR the runtime fails because `hasIndex` doesn't accept three args yet.

- [ ] **Step 3: Update `ClusterService` signatures and cache key**

In `apps/backend/src/services/cluster.service.ts`:

(a) Add the `MapLayerKind` import at the top:

```ts
import type { MapLayerKind } from '@shared/maps'
```

(b) Replace the existing `buildCacheKey` helper with the kinds-aware version:

```ts
/**
 * Deterministic cache key from profileId, tag selection, and layer kinds.
 * Sorting both arrays guarantees the same set always produces the same key.
 * The `|kinds` segment uses a different separator than `:tags` so the two
 * segments never collide.
 */
function buildCacheKey(
  profileId: string,
  tagIds: string[],
  kinds: MapLayerKind[]
): string {
  const tagPart = tagIds.length === 0 ? '' : `:${[...tagIds].sort().join(',')}`
  const kindPart = `|${[...kinds].sort().join(',')}`
  return `${profileId}${tagPart}${kindPart}`
}
```

(c) Add a required `kinds: MapLayerKind[]` parameter to every public method that takes `tagIds`. Remove the existing `tagIds` defaults too — explicit at every call site.

```ts
async buildIndex(
  profileId: string,
  tagIds: string[],
  kinds: MapLayerKind[]
): Promise<void> { /* existing body, with key/skip changes in Task 4 */ }

getClusters(
  profileId: string,
  bbox: [number, number, number, number],
  zoom: number,
  tagIds: string[],
  kinds: MapLayerKind[]
): { features: MapFeature[]; tags: TagWithTranslations[] } { /* uses buildCacheKey(profileId, tagIds, kinds) */ }

async getOrBuildClusters(
  profileId: string,
  bbox: [number, number, number, number],
  zoom: number,
  tagIds: string[],
  kinds: MapLayerKind[]
): Promise<{ features: MapFeature[]; tags: TagWithTranslations[] }> {
  this.pruneIndexes()
  const key = buildCacheKey(profileId, tagIds, kinds)
  if (!this.indexes.has(key)) {
    await this.buildIndex(profileId, tagIds, kinds)
  }
  return this.getClusters(profileId, bbox, zoom, tagIds, kinds)
}

getExpansionZoom(
  profileId: string,
  clusterId: number,
  tagIds: string[],
  kinds: MapLayerKind[]
): number {
  const cached = this.indexes.get(buildCacheKey(profileId, tagIds, kinds))
  if (!cached) return MAP_MAX_ZOOM
  return cached.index.getClusterExpansionZoom(clusterId)
}

getLeaves(
  profileId: string,
  clusterId: number,
  tagIds: string[],
  kinds: MapLayerKind[]
): PointFeature[] {
  const cacheKey = buildCacheKey(profileId, tagIds, kinds)
  const cached = this.indexes.get(cacheKey)
  if (!cached) return []
  return cached.index
    .getLeaves(clusterId, Infinity, 0)
    .map((f) => this.mapFeature(f, cacheKey) as PointFeature)
}

hasIndex(profileId: string, tagIds: string[], kinds: MapLayerKind[]): boolean {
  return this.indexes.has(buildCacheKey(profileId, tagIds, kinds))
}
```

(d) Update the `evict` method's prefix matching to handle the new `|` separator (in addition to the existing `:`):

```ts
evict(profileId: string): void {
  for (const key of this.indexes.keys()) {
    if (
      key === profileId ||
      key.startsWith(`${profileId}:`) ||
      key.startsWith(`${profileId}|`)
    ) {
      this.indexes.delete(key)
    }
  }
}
```

- [ ] **Step 4: Update every existing test call site in `cluster.service.spec.ts`**

Every existing call to `service.buildIndex(...)`, `service.getClusters(...)`, `service.getOrBuildClusters(...)`, `service.getExpansionZoom(...)`, `service.getLeaves(...)`, and `service.hasIndex(...)` needs explicit `tagIds` and `kinds` arguments.

For tests that today call `service.buildIndex('viewer-1')`, change to:

```ts
await service.buildIndex('viewer-1', [], ['profile', 'post'])
```

For tests that call `service.getClusters('viewer-1', [bbox], zoom)` change to:

```ts
service.getClusters('viewer-1', [16.0, 47.0, 20.0, 49.0], 12, [], ['profile', 'post'])
```

Same pattern for `getOrBuildClusters`, `getExpansionZoom`, `getLeaves`.

The route test at `cluster.service.spec.ts:179` currently asserts:
```ts
expect(mockFindSocialProfilesWithLocation).toHaveBeenCalledWith('viewer-1', [])
```
That assertion stays valid (the service still calls the DB with `(profileId, tagIds)` — kinds is a service-level concern, not a DB one).

- [ ] **Step 5: Re-run the layer-kinds test**

Run: `pnpm --filter backend exec vitest run -t "layer kinds"`
Expected: PASS.

- [ ] **Step 6: Run the full cluster service spec to confirm no regressions**

Run: `pnpm --filter backend exec vitest run cluster.service`
Expected: ALL PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/services/cluster.service.ts apps/backend/src/__tests__/services/cluster.service.spec.ts
git commit -m "refactor(backend): add kinds parameter to ClusterService"
```

---

## Task 4 — `buildIndex` selective fetching (TDD)

Skip DB queries for kinds that aren't selected. This is the perf payoff.

**Files:**
- Modify: `apps/backend/src/services/cluster.service.ts`
- Modify: `apps/backend/src/__tests__/services/cluster.service.spec.ts`

- [ ] **Step 1: Write failing tests for selective fetching**

Add to the `describe('layer kinds', ...)` block from Task 3:

```ts
it('skips post fetch when kinds is profile-only', async () => {
  mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
  mockFindMutualMatchIds.mockResolvedValue([])
  mockFindAllWithLocation.mockResolvedValue([])

  await service.buildIndex('viewer-1', [], ['profile'])

  expect(mockFindSocialProfilesWithLocation).toHaveBeenCalledTimes(1)
  expect(mockFindAllWithLocation).not.toHaveBeenCalled()
})

it('skips profile and match-id fetches when kinds is post-only', async () => {
  mockFindSocialProfilesWithLocation.mockResolvedValue([])
  mockFindMutualMatchIds.mockResolvedValue([])
  mockFindAllWithLocation.mockResolvedValue([makePost('post1', 47.5, 19.0, 'author1')])

  await service.buildIndex('viewer-1', [], ['post'])

  expect(mockFindSocialProfilesWithLocation).not.toHaveBeenCalled()
  expect(mockFindMutualMatchIds).not.toHaveBeenCalled()
  expect(mockFindAllWithLocation).toHaveBeenCalledTimes(1)
})

it('produces only post features when kinds is post-only', async () => {
  mockFindSocialProfilesWithLocation.mockResolvedValue([])
  mockFindMutualMatchIds.mockResolvedValue([])
  mockFindAllWithLocation.mockResolvedValue([makePost('post1', 47.5, 19.0, 'author1')])

  await service.buildIndex('viewer-1', [], ['post'])
  const { features } = service.getClusters(
    'viewer-1',
    [16.0, 47.0, 20.0, 49.0],
    12,
    [],
    ['post']
  )
  const points = features.filter((f) => f.type === 'point')
  expect(points).toHaveLength(1)
  expect(points[0]).toMatchObject({ kind: 'post' })
})
```

- [ ] **Step 2: Run tests — expect failure**

Run: `pnpm --filter backend exec vitest run -t "layer kinds"`
Expected: FAIL — `mockFindSocialProfilesWithLocation` and `mockFindAllWithLocation` are still called unconditionally.

- [ ] **Step 3: Implement selective fetching in `buildIndex`**

Replace the `Promise.all` block at the top of `buildIndex` with conditional fetches:

```ts
async buildIndex(
  profileId: string,
  tagIds: string[],
  kinds: MapLayerKind[]
): Promise<void> {
  const profileMatchService = ProfileMatchService.getInstance()
  const postService = PostService.getInstance()

  const wantProfiles = kinds.includes('profile')
  const wantPosts = kinds.includes('post')

  const [profiles, matchIds, posts] = await Promise.all([
    wantProfiles
      ? profileMatchService.findSocialProfilesWithLocation(profileId, tagIds)
      : Promise.resolve([] as Awaited<
          ReturnType<typeof profileMatchService.findSocialProfilesWithLocation>
        >),
    wantProfiles
      ? profileMatchService.findMutualMatchIds(profileId)
      : Promise.resolve([] as string[]),
    wantPosts
      ? postService.findAllWithLocation(profileId)
      : Promise.resolve([] as Awaited<
          ReturnType<typeof postService.findAllWithLocation>
        >),
  ])

  // ...rest of method unchanged (matchSet, profileFeatures map, postFeatures
  // loop, tagMap, supercluster construction, this.indexes.set with buildCacheKey)
}
```

The merge step ("profile + own post at same lat/lon → collapse with `hasPost: true`") naturally becomes a no-op when one of the arrays is empty; no special-casing needed.

The cache key write at the bottom of `buildIndex` must use `buildCacheKey(profileId, tagIds, kinds)`:

```ts
this.indexes.set(buildCacheKey(profileId, tagIds, kinds), {
  index,
  tags: Array.from(tagMap.values()),
  updatedAt: new Date(),
})
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `pnpm --filter backend exec vitest run cluster.service`
Expected: ALL PASS, including the three new tests from Step 1.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/services/cluster.service.ts apps/backend/src/__tests__/services/cluster.service.spec.ts
git commit -m "feat(backend): skip omitted-kind queries in buildIndex"
```

---

## Task 5 — `evict` covers new key shape (TDD)

The eviction prefix-match needs to handle keys without a `:tags` segment but with the new `|kinds` segment.

**Files:**
- Modify: `apps/backend/src/__tests__/services/cluster.service.spec.ts`

(Note: `evict` itself was already updated in Task 3; this task adds explicit coverage.)

- [ ] **Step 1: Add failing test for evict with the new separator**

Add inside the `describe('layer kinds', ...)` block:

```ts
it('evict clears entries with both : and | separators for the profile', async () => {
  mockFindSocialProfilesWithLocation.mockResolvedValue([makeProfile('p1', 47.5, 19.0)])
  mockFindMutualMatchIds.mockResolvedValue([])
  mockFindAllWithLocation.mockResolvedValue([])

  // Build with no tags (key shape: viewer-1|profile)
  await service.buildIndex('viewer-1', [], ['profile'])
  // Build with tags (key shape: viewer-1:tagA|profile)
  await service.buildIndex('viewer-1', ['tagA'], ['profile'])

  expect(service.hasIndex('viewer-1', [], ['profile'])).toBe(true)
  expect(service.hasIndex('viewer-1', ['tagA'], ['profile'])).toBe(true)

  service.evict('viewer-1')

  expect(service.hasIndex('viewer-1', [], ['profile'])).toBe(false)
  expect(service.hasIndex('viewer-1', ['tagA'], ['profile'])).toBe(false)
})
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter backend exec vitest run -t "evict clears entries with both"`
Expected: PASS (the implementation in Task 3 already covers this).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/__tests__/services/cluster.service.spec.ts
git commit -m "test(backend): cover evict across kinds-separator key shape"
```

---

## Task 6 — Backend route schemas (TDD)

Wire the `kinds` parameter into `/find/clusters` and `/find/cluster-leaves`.

**Files:**
- Modify: `apps/backend/src/api/routes/findProfile.route.ts`
- Modify: `apps/backend/src/__tests__/routes/findProfile.cluster.route.spec.ts`

- [ ] **Step 1: Write failing route tests for `kinds`**

Add inside the existing `describe('GET /clusters', ...)` block in `findProfile.cluster.route.spec.ts`:

```ts
it('forwards parsed kinds to the cluster service', async () => {
  mockGetOrBuildClusters.mockResolvedValue({ features: [], tags: [] })

  await handler()(
    {
      session: mockSession,
      query: { ...validQuery, kinds: 'post' },
      log: { error: vi.fn() },
    },
    reply
  )

  expect(mockGetOrBuildClusters).toHaveBeenCalledWith(
    'profile-123',
    [16.0, 45.0, 23.0, 48.0],
    10,
    [],
    ['post']
  )
})

it('returns 400 when kinds is empty', async () => {
  await handler()(
    {
      session: mockSession,
      query: { ...validQuery, kinds: '' },
      log: { error: vi.fn() },
    },
    reply
  )
  expect(reply.statusCode).toBe(400)
})

it('returns 400 when kinds is unknown', async () => {
  await handler()(
    {
      session: mockSession,
      query: { ...validQuery, kinds: 'unknown' },
      log: { error: vi.fn() },
    },
    reply
  )
  expect(reply.statusCode).toBe(400)
})
```

Update the existing assertion `expect(mockGetOrBuildClusters).toHaveBeenCalledWith('profile-123', [16.0, 45.0, 23.0, 48.0], 10, [])` near line 103 to include the new kinds arg. The default-when-omitted is intentionally rejected by `KindsSchema.min(1)`, so either:

(a) Add `kinds: 'profile,post'` to `validQuery` and update the assertion to `[..., ['profile', 'post']]`, OR
(b) Move the existing "valid bounds and zoom" test under a `validQuery` that includes `kinds`.

Pick (a) — change the top of the file:

```ts
const validQuery = {
  south: '45.0',
  north: '48.0',
  west: '16.0',
  east: '23.0',
  zoom: '10',
  kinds: 'profile,post',
}
```

And update the existing assertion in the "returns features and tags for valid bounds and zoom" test to:

```ts
expect(mockGetOrBuildClusters).toHaveBeenCalledWith(
  'profile-123',
  [16.0, 45.0, 23.0, 48.0],
  10,
  [],
  ['profile', 'post']
)
```

Mirror the same change for the existing "forwards parsed tagIds" test (add `kinds` to expected args).

For `GET /cluster-leaves` — the existing test (find it via the `describe('GET /cluster-leaves', ...)` block) similarly must include `kinds` in its valid query and the service-call assertion. Update its `query` literal and `mockGetLeaves.toHaveBeenCalledWith(...)` assertion.

- [ ] **Step 2: Run the new tests — expect failure**

Run: `pnpm --filter backend exec vitest run findProfile.cluster.route`
Expected: FAIL — Zod doesn't know about `kinds` yet, the handler ignores it, and the service is called with 4 args instead of 5.

- [ ] **Step 3: Update route schemas in `findProfile.route.ts`**

(a) Import `KindsSchema` at the top of the file:

```ts
import { KindsSchema } from '@shared/zod/map/cluster.dto'
```

(b) Extend both query schemas with `kinds`:

```ts
const ClusterQuerySchema = BoundsQuerySchema.extend({
  zoom: z.coerce.number().int().min(0).max(MAP_MAX_ZOOM),
  tagIds: TagIdsSchema,
  kinds: KindsSchema,
})

const LeavesQuerySchema = z.object({
  clusterId: z.coerce.number().int(),
  tagIds: TagIdsSchema,
  kinds: KindsSchema,
})
```

(c) In the `/clusters` handler, read `kinds` from `parsed.data` and pass it to `getOrBuildClusters`:

```ts
const { south, north, west, east, zoom, tagIds, kinds } = parsed.data
const bbox: [number, number, number, number] = [west, south, east, north]

const { features, tags: rawTags } = await clusterService.getOrBuildClusters(
  req.session.profileId,
  bbox,
  zoom,
  tagIds,
  kinds
)
```

(d) In the `/cluster-leaves` handler:

```ts
const { clusterId, tagIds, kinds } = parsed.data
const features = clusterService.getLeaves(req.session.profileId, clusterId, tagIds, kinds)
```

(e) Update the JSDoc on both routes — add a `@query {string} kinds` line and note that the `kinds` value must match between cluster and leaf queries (each `(tags, kinds)` combination is a separate cached index).

- [ ] **Step 4: Run all route tests**

Run: `pnpm --filter backend exec vitest run findProfile.cluster.route`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/api/routes/findProfile.route.ts apps/backend/src/__tests__/routes/findProfile.cluster.route.spec.ts
git commit -m "feat(backend): accept kinds query param on cluster routes"
```

---

## Task 7 — i18n keys

**Files:**
- Modify: `packages/shared/i18n/en.json`

- [ ] **Step 1: Read the current top-level structure**

Run: `python3 -c "import json; d=json.load(open('/home/user/opencupid/packages/shared/i18n/en.json')); print(sorted(d.keys()))"`

Expected: a list of top-level keys; confirm `map` is NOT present (it isn't, per spec exploration).

- [ ] **Step 2: Add the `map.layer_control` block**

Add a `map` top-level key to `packages/shared/i18n/en.json`. Insert it in alphabetical order alongside other top-level keys (e.g. between `landing` and `messaging` if those exist; otherwise wherever fits the file's existing pattern):

```json
"map": {
  "layer_control": {
    "people": "People",
    "posts": "Posts",
    "aria_label": "Map layers"
  }
}
```

Use the Read tool first to find the right insertion point and preserve the surrounding formatting (indentation, trailing commas).

- [ ] **Step 3: Verify JSON is valid**

Run: `python3 -c "import json; json.load(open('/home/user/opencupid/packages/shared/i18n/en.json'))"`
Expected: no output (no parse error).

- [ ] **Step 4: Commit**

```bash
git add packages/shared/i18n/en.json
git commit -m "i18n: add map.layer_control keys"
```

---

## Task 8 — `BButtonGroup` in test setup globals

**Files:**
- Modify: `apps/frontend/src/tests/setup.ts`

- [ ] **Step 1: Add `BButtonGroup` to the BVN imports + global config**

Open `apps/frontend/src/tests/setup.ts`. Add `BButtonGroup` to the imports from `bootstrap-vue-next`:

```ts
import {
  BInput,
  BForm,
  BButton,
  BButtonGroup,
  BFormFloatingLabel,
  // ...rest unchanged
} from 'bootstrap-vue-next'
```

Then add it to the `config.global.components` (or equivalent registration block) — search the file for where `BButton` is registered and mirror the addition. If the file uses an object-spread style:

```ts
config.global.components = {
  ...config.global.components,
  BInput,
  BForm,
  BButton,
  BButtonGroup,
  // ...rest unchanged
}
```

- [ ] **Step 2: Sanity-check the file still parses**

Run: `pnpm --filter frontend exec vitest run --no-color -t "no-such-test-name-just-load-config" 2>&1 | head -20`
Expected: vitest loads, reports "0 tests" or similar — no syntax/import error from setup.ts.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/tests/setup.ts
git commit -m "test(frontend): register BButtonGroup in test globals"
```

---

## Task 9 — Rewrite `MapLayerControl.vue` as button toggles (TDD)

Replace the checkboxes with a `<BButtonGroup>` of `<BButton :pressed>` toggle buttons; enforce the "at least one selected" invariant.

**Files:**
- Rewrite: `apps/frontend/src/features/map/components/MapLayerControl.vue`
- Rewrite: `apps/frontend/src/features/map/components/__tests__/MapLayerControl.spec.ts`

- [ ] **Step 1: Rewrite the test file first (TDD)**

Replace the entire contents of `apps/frontend/src/features/map/components/__tests__/MapLayerControl.spec.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: { value: 'en' },
  }),
}))

import MapLayerControl from '../MapLayerControl.vue'
import { useMapStore } from '../../stores/mapStore'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('MapLayerControl', () => {
  function buttons(wrapper: ReturnType<typeof mount>) {
    const all = wrapper.findAll('button')
    if (all.length !== 2) throw new Error(`expected 2 buttons, got ${all.length}`)
    return { people: all[0]!, posts: all[1]! }
  }

  it('renders both layer toggles with translation keys', () => {
    const wrapper = mount(MapLayerControl)
    const text = wrapper.text()
    expect(text).toContain('map.layer_control.people')
    expect(text).toContain('map.layer_control.posts')
  })

  it('reflects initial store visibility (both pressed)', () => {
    const wrapper = mount(MapLayerControl)
    const { people, posts } = buttons(wrapper)
    expect(people.attributes('aria-pressed')).toBe('true')
    expect(posts.attributes('aria-pressed')).toBe('true')
  })

  it('toggles showPeople off when clicked while showPosts is on', async () => {
    const wrapper = mount(MapLayerControl)
    const store = useMapStore()
    const { people } = buttons(wrapper)
    await people.trigger('click')
    expect(store.showPeople).toBe(false)
    expect(store.showPosts).toBe(true)
  })

  it('toggles showPosts off when clicked while showPeople is on', async () => {
    const wrapper = mount(MapLayerControl)
    const store = useMapStore()
    const { posts } = buttons(wrapper)
    await posts.trigger('click')
    expect(store.showPosts).toBe(false)
    expect(store.showPeople).toBe(true)
  })

  it('clicking the only-pressed button is a no-op (both stay as they were)', async () => {
    const wrapper = mount(MapLayerControl)
    const store = useMapStore()
    store.setShowPosts(false)
    await wrapper.vm.$nextTick()
    const { people } = buttons(wrapper)
    await people.trigger('click')
    expect(store.showPeople).toBe(true)
    expect(store.showPosts).toBe(false)
  })

  it('updates aria-pressed when the store mutates externally', async () => {
    const wrapper = mount(MapLayerControl)
    const store = useMapStore()
    store.setShowPeople(false)
    await wrapper.vm.$nextTick()
    const { people } = buttons(wrapper)
    expect(people.attributes('aria-pressed')).toBe('false')
  })
})
```

- [ ] **Step 2: Run the tests — expect failure**

Run: `pnpm --filter frontend exec vitest run MapLayerControl`
Expected: FAIL — current component renders `<input type="checkbox">`, not `<button>`.

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `apps/frontend/src/features/map/components/MapLayerControl.vue`:

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { BButton, BButtonGroup } from 'bootstrap-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useI18n } from '@/lib/i18n'

const { t } = useI18n()
const mapStore = useMapStore()
const { showPeople, showPosts } = storeToRefs(mapStore)

function toggle(layer: 'people' | 'posts') {
  if (layer === 'people') {
    if (showPeople.value && !showPosts.value) return
    mapStore.setShowPeople(!showPeople.value)
  } else {
    if (showPosts.value && !showPeople.value) return
    mapStore.setShowPosts(!showPosts.value)
  }
}
</script>

<template>
  <div class="map-layer-control">
    <BButtonGroup
      size="sm"
      :aria-label="t('map.layer_control.aria_label')"
    >
      <BButton
        :pressed="showPeople"
        :variant="showPeople ? 'primary' : 'outline-secondary'"
        @click="toggle('people')"
      >
        <i class="bi bi-people-fill" /> {{ t('map.layer_control.people') }}
      </BButton>
      <BButton
        :pressed="showPosts"
        :variant="showPosts ? 'primary' : 'outline-secondary'"
        @click="toggle('posts')"
      >
        <i class="bi bi-chat-dots-fill" /> {{ t('map.layer_control.posts') }}
      </BButton>
    </BButtonGroup>
  </div>
</template>

<style scoped>
.map-layer-control {
  user-select: none;
}
</style>
```

Notes on the component:
- The "click on the only-pressed button is a no-op" rule lives in `toggle()` — it returns early if the button being clicked is the only one currently pressed.
- The outer wrapper used to carry the white card chrome (background, padding, shadow). That's removed because the placement-as-overlay decision in Task 12 handles the visual containment via the host. If you want to keep the chrome, wrap the host's mount of `<MapLayerControl>` rather than re-introducing it here.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run MapLayerControl`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/map/components/MapLayerControl.vue apps/frontend/src/features/map/components/__tests__/MapLayerControl.spec.ts
git commit -m "feat(frontend): button-toggle map layer control"
```

---

## Task 10 — Update `mapStore` doc comment

**Files:**
- Modify: `apps/frontend/src/features/map/stores/mapStore.ts`

- [ ] **Step 1: Replace the file's doc comment**

Open `apps/frontend/src/features/map/stores/mapStore.ts`. Replace the current top-of-file doc block with:

```ts
/**
 * Map UI state — per-layer visibility for the BrowseProfiles map's layer
 * control. The selection is sent to the backend as the `kinds` query param
 * on cluster fetches; toggling a layer in the UI causes
 * `findProfileStore` to invalidate its bounds cache and refetch.
 *
 * The component-level invariant that at least one layer is always selected
 * keeps the wire payload non-empty (the backend rejects empty `kinds`).
 */
```

Per project rule (`MEMORY.md`: comments describe present, not history), no "previously" / "is now" phrasing. The new comment describes only the current behaviour.

- [ ] **Step 2: Confirm nothing else changed**

Run: `git diff apps/frontend/src/features/map/stores/mapStore.ts`
Expected: only the doc-comment block changed; the store body unchanged.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/map/stores/mapStore.ts
git commit -m "docs(frontend): rewrite mapStore comment for server-filter behaviour"
```

---

## Task 11 — `findProfileStore` threads `kinds` through fetches (TDD)

**Files:**
- Modify: `apps/frontend/src/features/browse/stores/findProfileStore.ts`
- Modify: `apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts`

- [ ] **Step 1: Read the existing test file to find existing assertions to update**

Run: `wc -l /home/user/opencupid/apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts`

Open the file. Existing tests use `expect(mockGet).toHaveBeenCalledWith('/find/clusters', expect.objectContaining({ params: expect.objectContaining({...}) }))` patterns.

- [ ] **Step 2: Add new failing tests**

Append a new `describe` block to the test file:

```ts
describe('findClustersForMapBounds with layer kinds', () => {
  let store: ReturnType<typeof useFindProfileStore>
  const bounds = { south: 45, north: 48, west: 16, east: 23 }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    store.teardown()
    vi.clearAllMocks()
  })

  it('sends kinds=profile,post when both layers are on', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    await store.findClustersForMapBounds(bounds, 7)

    expect(mockGet).toHaveBeenCalledWith(
      '/find/clusters',
      expect.objectContaining({
        params: expect.objectContaining({ kinds: 'profile,post' }),
      })
    )
  })

  it('sends kinds=post when only Posts is selected', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    const { useMapStore } = await import('@/features/map/stores/mapStore')
    const mapStore = useMapStore()
    mapStore.setShowPeople(false)

    await store.findClustersForMapBounds(bounds, 7)

    expect(mockGet).toHaveBeenCalledWith(
      '/find/clusters',
      expect.objectContaining({
        params: expect.objectContaining({ kinds: 'post' }),
      })
    )
  })

  it('skips network when same kinds + same viewport are already cached', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    await store.findClustersForMapBounds(bounds, 7)
    expect(mockGet).toHaveBeenCalledTimes(1)

    await store.findClustersForMapBounds(bounds, 7)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('refetches when kinds changes even with the same viewport', async () => {
    mockGet.mockResolvedValue({ data: { success: true, features: [], tags: [] } })

    await store.findClustersForMapBounds(bounds, 7)
    expect(mockGet).toHaveBeenCalledTimes(1)

    const { useMapStore } = await import('@/features/map/stores/mapStore')
    useMapStore().setShowPosts(false)

    await store.findClustersForMapBounds(bounds, 7)
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(mockGet).toHaveBeenLastCalledWith(
      '/find/clusters',
      expect.objectContaining({
        params: expect.objectContaining({ kinds: 'profile' }),
      })
    )
  })
})
```

- [ ] **Step 3: Run the new tests — expect failure**

Run: `pnpm --filter frontend exec vitest run findProfileStore`
Expected: FAIL — the store doesn't send `kinds` yet.

- [ ] **Step 4: Update the store**

Open `apps/frontend/src/features/browse/stores/findProfileStore.ts`.

(a) Add imports:

```ts
import { useMapStore } from '@/features/map/stores/mapStore'
import { MAP_LAYER_KINDS, type MapLayerKind } from '@shared/maps'
```

(b) Add helpers near the existing `tagSignature` / `tagIdsParam`:

```ts
function kindsSignature(kinds: MapLayerKind[]): string {
  return [...kinds].sort().join(',')
}

function kindsParam(kinds: MapLayerKind[]): string {
  // Schema requires non-empty; always emit so dev-tools URLs are explicit.
  return kinds.join(',')
}

function selectedKinds(): MapLayerKind[] {
  const m = useMapStore()
  const kinds: MapLayerKind[] = []
  if (m.showPeople) kinds.push('profile')
  if (m.showPosts) kinds.push('post')
  return kinds
}
```

(c) Add a module-scoped cache var alongside the existing `cachedClusterTagSig`:

```ts
let cachedClusterKindsSig = ''
```

(d) Update `invalidateBoundsCache`:

```ts
function invalidateBoundsCache(): void {
  cachedClusterBounds = null
  cachedClusterZoom = null
  cachedClusterTagSig = ''
  cachedClusterKindsSig = ''
  popupCache.clear()
}
```

(e) Update `findClustersForMapBounds`:

```ts
async findClustersForMapBounds(
  bounds: MapBounds,
  zoom: number
): Promise<StoreVoidSuccess | StoreError> {
  zoom = Math.round(zoom)

  if (clusterAbortController) {
    clusterAbortController.abort()
  }
  const controller = new AbortController()
  clusterAbortController = controller
  this.lastMapBounds = bounds

  const tagIds = useSearchStore().selectedTagIds
  const sig = tagSignature(tagIds)
  const kinds = selectedKinds()
  const kindsSig = kindsSignature(kinds)

  const sameTags = sig === cachedClusterTagSig
  const sameKinds = kindsSig === cachedClusterKindsSig
  const zoomChanged = cachedClusterZoom !== zoom

  if (
    sameTags &&
    sameKinds &&
    !zoomChanged &&
    cachedClusterBounds &&
    boundsContain(cachedClusterBounds, bounds)
  ) {
    this.isLoading = false
    return storeSuccess()
  }

  try {
    this.isLoading = true

    const paddedBounds = padBounds(bounds, 0.3)
    const res = await safeApiCall(() =>
      api.get('/find/clusters', {
        params: {
          ...paddedBounds,
          zoom,
          tagIds: tagIdsParam(tagIds),
          kinds: kindsParam(kinds),
        },
        signal: controller.signal,
      })
    )

    const parsed = ClusterMapResponseSchema.parse(res.data)
    this.clusterFeatures = parsed.features
    this.availableTags = parsed.tags
    cachedClusterBounds = paddedBounds
    cachedClusterZoom = zoom
    cachedClusterTagSig = sig
    cachedClusterKindsSig = kindsSig

    return storeSuccess()
  } catch (error: any) {
    if (error instanceof CanceledError) {
      return storeSuccess()
    }
    this.clusterFeatures = []
    return storeError(error, 'Failed to fetch map clusters')
  } finally {
    if (clusterAbortController === controller) {
      this.isLoading = false
    }
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run findProfileStore`
Expected: ALL PASS, including all four new tests.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/browse/stores/findProfileStore.ts apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts
git commit -m "feat(frontend): thread kinds param through cluster fetches"
```

---

## Task 12 — Mount `<MapLayerControl>` and watch toggles (TDD)

**Files:**
- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue`
- Modify: `apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts`

- [ ] **Step 1: Read the existing tag-watcher test to mirror**

Open `apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts` and find the test that asserts `findProfileStore.refetchBounds()` is called when `searchStore.selectedTagIds` changes. Mirror its structure.

- [ ] **Step 2: Add a failing test for the layer-toggle watcher**

Add a new `it` block (inside the same `describe` that covers the tag watcher):

```ts
it('refetches bounds when mapStore.showPeople toggles', async () => {
  const wrapper = mount(BrowseProfiles, { /* same options as the tag-watcher test */ })
  const findStore = useFindProfileStore()
  const refetch = vi.spyOn(findStore, 'refetchBounds').mockResolvedValue()

  const mapStore = useMapStore()
  mapStore.setShowPeople(false)
  await wrapper.vm.$nextTick()

  expect(refetch).toHaveBeenCalledTimes(1)
})
```

Add `import { useMapStore } from '@/features/map/stores/mapStore'` to the test file's imports if not already present.

- [ ] **Step 3: Run the test — expect failure**

Run: `pnpm --filter frontend exec vitest run BrowseProfiles`
Expected: FAIL — the watcher doesn't exist yet.

- [ ] **Step 4: Add the import, mount, and watcher to `BrowseProfiles.vue`**

(a) Add to script imports (alongside the existing block at the top of `<script setup>`, near line 18 where `OsmPoiMap` is imported and line 11 where `useFindProfileStore` is imported):

```ts
import MapLayerControl from '@/features/map/components/MapLayerControl.vue'
import { useMapStore } from '@/features/map/stores/mapStore'
```

(b) Just below the existing `selectedTagIds` watcher (around line 58), add:

```ts
// Server-side layer filtering: toggling a layer changes the `kinds` query
// param sent on cluster fetches. Invalidate the bounds cache and refetch.
const mapStore = useMapStore()
const { showPeople, showPosts } = storeToRefs(mapStore)
watch(
  () => [showPeople.value, showPosts.value] as const,
  () => {
    findProfileStore.refetchBounds()
  }
)
```

(c) In the template, mount `<MapLayerControl>` as an overlay on the map. Place it inside the `<main>` block, after the `<OsmPoiMap>` element, wrapped for absolute positioning at the top-right of the map area:

```vue
<div
  class="map-layer-control-wrapper position-absolute"
  style="top: 4rem; right: 0.5rem; z-index: 1010"
>
  <MapLayerControl />
</div>
```

The `top: 4rem` offset clears the existing `SearchBar` overlay; verify by inspection in the browser during the smoke check (Task 14).

(d) Add scoped style for the wrapper if needed (for now the inline style is enough — promote to scoped CSS only if you find yourself adding more rules).

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter frontend exec vitest run BrowseProfiles`
Expected: ALL PASS, including the new test.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/browse/views/BrowseProfiles.vue apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts
git commit -m "feat(frontend): mount MapLayerControl and refetch on toggle"
```

---

## Task 13 — Full test sweep + format

- [ ] **Step 1: Run full backend test suite**

Run: `pnpm --filter backend test`
Expected: ALL PASS.

- [ ] **Step 2: Run full frontend test suite**

Run: `pnpm --filter frontend test`
Expected: ALL PASS.

- [ ] **Step 3: Run type-check across the monorepo**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: no errors. If errors, fix and re-run.

- [ ] **Step 5: Run the i18n validator agent on touched files**

Dispatch the `i18n-validator` agent on the modified Vue templates. (See CLAUDE.md.)

Expected: no missing or unused keys flagged for `map.layer_control.*`.

- [ ] **Step 6: Format only the files you touched**

Build the file list (only files modified on this branch, excluding the spec/plan in docs/):

```bash
git diff --name-only main...HEAD | grep -v '^docs/' | grep -E '\.(ts|tsx|vue|json)$'
```

Run prettier on each:

```bash
pnpm exec prettier --write <file1> <file2> ...
```

- [ ] **Step 7: If prettier produced changes, commit them**

```bash
git add -u
git diff --cached --quiet || git commit -m "style: prettier on touched files"
```

---

## Task 14 — Browser smoke check

Manual verification. The unit tests cover the wiring; this confirms the cluster math and visuals on the live app.

- [ ] **Step 1: Start the dev stack**

Run: `pnpm dev` (foreground in another terminal, or background it).

- [ ] **Step 2: Log in**

In Firefox: navigate to `https://localhost:5173/auth`. Log in as `me@example.org` (per CLAUDE.md). Then go to `/browse`.

- [ ] **Step 3: Toggle layers and verify behaviour**

(a) Open the browser DevTools → Network tab. Toggle the "People" button off. Confirm a `GET /find/clusters?...&kinds=post` request fires. The map should re-render showing only posts.
(b) Toggle "People" back on, then toggle "Posts" off. Confirm `kinds=profile`. Profiles only on the map.
(c) Try clicking the only-active button. The button should not become unpressed; no network request fires.
(d) Confirm that cluster counts reflect the active selection (clicking a cluster expands to only the kind(s) you have on).

- [ ] **Step 4: If anything is off, return to the relevant task and fix**

Otherwise proceed.

---

## Task 15 — Changeset + finalize

- [ ] **Step 1: Write a changeset**

Pick three random kebab-cased words for the filename (e.g. `silver-tags-bloom`). Create the file:

```bash
cat > .changeset/silver-tags-bloom.md << 'EOF'
---
'@opencupid/frontend': minor
'@opencupid/backend': minor
---

Server-side filtering for the social map's people/posts layers. Adds a `kinds` query parameter to `/find/clusters` and `/find/cluster-leaves`, and replaces the planned client-side layer toggle with a button-group `<MapLayerControl>` that drives a refetch on change.
EOF
```

(Per `MEMORY.md`: changesets are release-note short — keep it tight.)

- [ ] **Step 2: Commit the changeset**

```bash
git add .changeset/silver-tags-bloom.md
git commit -m "chore: changeset for map layer server filter"
```

- [ ] **Step 3: Run the CI mirror**

Run: `pnpm run ci:test`
Expected: all green.

- [ ] **Step 4: Push and open PR (only when finalizing)**

```bash
git push -u origin feat/map-layer-server-filter
gh pr create --title "Server-side map layer filtering with button-toggle control" --body "$(cat <<'EOF'
## Summary
- Replace the (never-mounted) client-side layer-control checkboxes with a `<BButtonGroup>` of toggle buttons for People / Posts.
- Move filtering from view-model intent to actual server-side filter: `ClusterService.buildIndex` now skips the DB query for the omitted kind, and the cache key gains a sorted `|kinds` segment.
- Frontend store reads layer selection from `mapStore` at fetch time and treats kinds as part of the bounds-cache signature; toggling triggers a refetch.

## Test plan
- [x] `pnpm --filter backend test` passes
- [x] `pnpm --filter frontend test` passes
- [x] `pnpm type-check` clean
- [x] `pnpm lint` clean
- [x] Browser smoke: toggling each layer triggers a single `/find/clusters?...&kinds=...` request and re-renders accordingly
- [x] Clicking the only-pressed button is a no-op

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Watch CI in the background**

Dispatch a subagent to watch CI per CLAUDE.md (`gh run watch --exit-status`). Address any failures and re-push.
