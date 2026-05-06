# Map layer server-side filter — design

**Date:** 2026-05-06
**Branch:** `feat/map-layer-server-filter`
**Scope:** frontend (`apps/frontend`), backend (`apps/backend`), shared (`packages/shared`)

## Goal

Move map-layer filtering (people / posts) from a client-side display toggle to a server-side filter applied at index-build time inside `ClusterService`. The driving principle is separation of concerns: filtering belongs to supercluster, not to view-model code that hides already-clustered points. Today's intended-but-unimplemented client filter would produce dishonest cluster counts (a cluster of 5 expanding to 3 after a layer is hidden); doing the filter at index time keeps cluster math accurate per-selection.

The user-facing change is a `<MapLayerControl>` button-toggle group sitting on the map. The wire-level change is a new required `kinds` query parameter on `/find/clusters` and `/find/cluster-leaves`.

## Architecture

One combined supercluster index per `(profileId, tagIds, kinds)` tuple. Cache key gains a kinds segment; building skips data sources for omitted kinds; the rest of `ClusterService` stays as it is.

```
mapStore (showPeople, showPosts: boolean)
        │
        │  reactor in BrowseProfiles.vue
        ▼
findProfileStore.refetchBounds()  ──► /find/clusters?…&kinds=profile,post
                                              │
                                              ▼
                                    ClusterService.getOrBuildClusters(
                                        profileId, bbox, zoom,
                                        tagIds, kinds              ◄── new
                                    )
                                              │
                                              ▼
                                    cache key:
                                        profileId
                                       [:tagIds...]
                                       |kinds...
                                              │
                                              ▼
                          buildIndex skips DB queries for omitted kinds
```

## Components

### 1. `MapLayerControl.vue` (existing, untracked file — repurpose)

Replace the two `<input type="checkbox">` controls with a `<BButtonGroup>` of `<BButton :pressed>` toggle buttons from `bootstrap-vue-next`.

- Markup: `<BButtonGroup size="sm">` containing two `<BButton>`s, each bound via `:pressed="showPeople"` / `:pressed="showPosts"` (BVN sets `aria-pressed` automatically).
- Active style: `:variant="active ? 'primary' : 'outline-secondary'"` (matches `AnonymousToggle.vue` and `DatingWizardStepper.vue`).
- Icons: `bi-people-fill`, `bi-chat-dots-fill`.
- Multi-select: both buttons can be pressed simultaneously (default state).
- **Invariant:** at least one layer is always selected. The click handler reads the resulting state before writing — clicking the only-pressed button is a no-op. This avoids a degenerate `kinds=` empty wire payload.
- Store binding unchanged: `storeToRefs(mapStore)` over `showPeople`, `showPosts`.

### 2. `mapStore` (existing)

Public surface unchanged: `showPeople`, `showPosts`, `setShowPeople()`, `setShowPosts()`. Only the doc comment changes — see Migration §3.

### 3. Shared types (`packages/shared/maps.ts`)

Add a single source of truth for layer kinds:

```ts
export const MAP_LAYER_KINDS = ['profile', 'post'] as const
export type MapLayerKind = (typeof MAP_LAYER_KINDS)[number]
```

`PointFeatureSchema.kind` (`packages/shared/zod/map/cluster.dto.ts`) currently inlines `z.enum(['profile', 'post'])`. Update it to `z.enum(MAP_LAYER_KINDS)` so the union is defined once.

### 4. Wire schema (`packages/shared/zod/map/cluster.dto.ts`)

Add a parser shared between both backend routes:

```ts
export const KindsSchema = z
  .string()
  .default('')
  .transform((raw) => [
    ...new Set(
      raw.split(',').map((s) => s.trim()).filter(Boolean)
    ),
  ])
  .pipe(z.array(z.enum(MAP_LAYER_KINDS)).min(1).max(MAP_LAYER_KINDS.length))
```

`.default('')` lets the parser run when the param is absent — the resulting empty array is then rejected by `.min(1)`, returning a 400. Same outcome as omitting the param entirely; just keeps the parser composable with the rest of the query schema. The "required at the API" framing in the route section refers to the post-parse contract: the service never sees an empty `kinds[]`.

### 5. Backend routes (`apps/backend/src/api/routes/findProfile.route.ts`)

`ClusterQuerySchema` and `LeavesQuerySchema` both extend with `kinds: KindsSchema`. Both routes pass `kinds` through to the service. The pre-existing comment on `cluster-leaves` warning that `tagIds` must match between cluster and leaf queries now also applies to `kinds` — document this in the route doc.

### 6. `ClusterService` (`apps/backend/src/services/cluster.service.ts`)

**Cache key:**

```ts
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

The `|` separator unambiguously delimits the kinds segment from the tags segment. Sorting kinds before joining means `['profile','post']` and `['post','profile']` produce the same key.

**Method signatures** — every public method that takes `tagIds` gains a required `kinds` parameter (no defaults; explicit at every call site):

- `buildIndex(profileId, tagIds, kinds)`
- `getOrBuildClusters(profileId, bbox, zoom, tagIds, kinds)`
- `getClusters(profileId, bbox, zoom, tagIds, kinds)`
- `getLeaves(profileId, clusterId, tagIds, kinds)`
- `getExpansionZoom(profileId, clusterId, tagIds, kinds)`
- `hasIndex(profileId, tagIds, kinds)`

**`buildIndex` selective fetching** — skip DB queries for omitted kinds:

```ts
const wantProfiles = kinds.includes('profile')
const wantPosts = kinds.includes('post')

const [profiles, matchIds, posts] = await Promise.all([
  wantProfiles
    ? profileMatchService.findSocialProfilesWithLocation(profileId, tagIds)
    : Promise.resolve([]),
  wantProfiles
    ? profileMatchService.findMutualMatchIds(profileId)
    : Promise.resolve([]),
  wantPosts
    ? postService.findAllWithLocation(profileId)
    : Promise.resolve([]),
])
```

`findMutualMatchIds` is only used to highlight profile points, so it's gated on `wantProfiles` along with the profile fetch itself. The merge step ("profile at same lat/lon as their own post → collapse with `hasPost: true`") is naturally a no-op when one side is empty; no special-casing needed.

**`evict` separator fix** — current `key.startsWith(\`${profileId}:\`)` misses the new no-tags-with-kinds shape `${profileId}|...`. Match both:

```ts
if (
  key === profileId ||
  key.startsWith(`${profileId}:`) ||
  key.startsWith(`${profileId}|`)
) {
  this.indexes.delete(key)
}
```

### 7. Frontend store (`apps/frontend/src/features/browse/stores/findProfileStore.ts`)

Parallel to existing tag handling.

**New helpers:**
```ts
function kindsSignature(kinds: MapLayerKind[]): string {
  return [...kinds].sort().join(',')
}

function kindsParam(kinds: MapLayerKind[]): string {
  return kinds.join(',')   // schema requires non-empty; always emit
}

function selectedKinds(): MapLayerKind[] {
  const m = useMapStore()
  const kinds: MapLayerKind[] = []
  if (m.showPeople) kinds.push('profile')
  if (m.showPosts) kinds.push('post')
  return kinds
}
```

`kindsParam` always emits the param (no `undefined` shortcut), matching the `min(1)` requirement on the wire and keeping dev-tools URLs unambiguous. `selectedKinds()` returning `[]` would be a programmer error — let the backend 400 surface it rather than silently substituting both. No fallback (per project rule: ask before adding fallbacks).

**New module-scoped cache var:**
```ts
let cachedClusterKindsSig = ''
```

**`findClustersForMapBounds` changes:**
- Compute `kinds = selectedKinds()` and `kindsSig = kindsSignature(kinds)` alongside the existing `tagIds` / `sig`.
- Cache-hit guard adds `const sameKinds = kindsSig === cachedClusterKindsSig` to the `&&`-chain.
- Axios params include `kinds: kindsParam(kinds)`.
- On success: `cachedClusterKindsSig = kindsSig`.

**`invalidateBoundsCache`** also resets `cachedClusterKindsSig = ''` (mirrors `cachedClusterTagSig`).

### 8. Host integration (`apps/frontend/src/features/browse/views/BrowseProfiles.vue`)

- Mount `<MapLayerControl>` as an overlay on the map. Default position: top-right inside `.osm-poi-map-wrapper` via `position: absolute`. Visual placement may be revisited during implementation review; not load-bearing for the design.
- Wire a watcher mirroring the existing `searchStore.selectedTagIds` reactor. Use `storeToRefs(mapStore)` to extract reactive refs so the watcher tracks changes correctly:
  ```ts
  const { showPeople, showPosts } = storeToRefs(useMapStore())
  watch(
    () => [showPeople.value, showPosts.value] as const,
    () => findProfileStore.refetchBounds()
  )
  ```
- `refetchBounds()` already invalidates the bounds cache and re-fetches with the current viewport; since the store reads `kindsParam` at fetch time, no parameter passing is needed.

## Data flow

1. User clicks a layer toggle. `mapStore.showPeople` (or `showPosts`) flips. The component-level invariant blocks the click if it would leave both off.
2. `BrowseProfiles.vue` watcher fires, calls `findProfileStore.refetchBounds()`.
3. `refetchBounds()` clears `cachedClusterBounds` / `cachedClusterZoom` / `cachedClusterTagSig` / `cachedClusterKindsSig`, then re-runs `findClustersForMapBounds` with the last viewport.
4. The fetch reads `selectedKinds()` from `mapStore`, builds the URL with `kinds=profile,post` (or just one), and hits `/find/clusters`.
5. Backend `KindsSchema` parses; route passes `kinds` to `getOrBuildClusters`.
6. Cache miss → `buildIndex` fetches only the data sources for selected kinds, builds a single supercluster, caches under `${profileId}[:${tags}]|${kinds}`.
7. Response: features + tags. Frontend renders.

Cluster-leaves queries (`/find/cluster-leaves`) follow the same `kinds` contract — the leaves request must use the *same* `kinds` value as the cluster query, otherwise the cluster id refers to a different cached index. The route doc already warns about this for `tagIds`; extend the warning to `kinds`.

## Error handling

- **Empty `kinds` on the wire:** `KindsSchema.min(1)` rejects with the route's existing 400 path (`'Missing or invalid query parameters'`). No new code path.
- **Both layers off in the UI:** prevented by the click-handler invariant; never reaches the API.
- **Stale cache after data changes:** `evict(profileId)` extension covers all `(tags, kinds)` variants for that profile via the dual-prefix match. `evictAll()` is unchanged (clears the entire map).
- **Cache fragmentation:** worst case 3× existing entries per tag combo (people-only, posts-only, both) — capped by the existing `INDEX_MAX_SIZE = 200` LRU eviction. Acceptable.

## Testing

### Backend

`apps/backend/src/__tests__/services/cluster.service.spec.ts`:
- Existing tests gain a `kinds` argument on every service call.
- New: `buildIndex` with `kinds: ['profile']` does not call `postService.findAllWithLocation` (verifies the perf claim).
- New: `buildIndex` with `kinds: ['post']` does not call `findSocialProfilesWithLocation` or `findMutualMatchIds`.
- New: different `kinds` selections produce different cache keys (toggling the layer rebuilds).
- New: `evict(profileId)` clears entries with tag-only and kinds-only key shapes for that profile.

`apps/backend/src/__tests__/routes/findProfile.cluster.route.spec.ts`:
- Add cases for `kinds=profile`, `kinds=post`, `kinds=profile,post`.
- Assert 400 on missing or empty `kinds`.

### Frontend

`apps/frontend/src/features/map/components/__tests__/MapLayerControl.spec.ts` (rewrite):
- Replace `input[type="checkbox"]` queries with `button` queries.
- Initial state: both buttons pressed.
- Clicking a pressed button toggles its store boolean (when the other is also on).
- External store mutation reflects in `aria-pressed`.
- Clicking the only-pressed button is a no-op (both store booleans remain).
- Translation-key assertion preserved.

`apps/frontend/src/tests/setup.ts`: add `BButtonGroup` to the BVN globals registry.

`apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts`:
- Existing tests assert `kinds` param is sent on the axios call.
- New: changing `mapStore.showPosts` invalidates the bounds cache (next fetch hits the network even with same viewport).
- New: same kinds + same viewport returns cached, no network call.

`apps/frontend/src/features/browse/views/__tests__/BrowseProfiles.spec.ts`:
- New: toggling `mapStore.showPosts` triggers `findProfileStore.refetchBounds()` — mirror the existing tag-change test.

## Migration & loose ends

1. **`ClusterService.evict()`** — extend the prefix match to handle the new `|kinds` separator. Covered above.
2. **i18n keys** in `packages/shared/i18n/en.json` under `map.layer_control`. Read the file first; add only the keys that are missing. Required final state:
   ```json
   { "people": "People", "posts": "Posts", "aria_label": "Map layers" }
   ```
   After implementation, run the `i18n-validator` agent on the modified files to catch any stragglers.
3. **`mapStore.ts` doc comment** — replace "Backend cluster fetches still cover both kinds; toggles filter at the view-model layer so flipping a switch is instant (no refetch)" with a present-tense description: layer selection is sent to the backend as the `kinds` query param; toggling triggers a refetch via bounds-cache invalidation. (Per project rule: comments describe present, not history — no "previously" / "is now" phrasing.)
4. **No backwards compatibility.** `kinds` is required. No new shim added; the existing deprecated shims (`/social/map/clusters`, etc.) suggest the team accepts hard cutovers for this surface, and the endpoint is only consumed by the SPA shipped in lockstep with the backend.
5. **Changeset** — `.changeset/<adjective-noun-verb>.md`, minor bump for `@opencupid/frontend` and `@opencupid/backend` (new feature).

## Out of scope

- Refactoring `findProfileStore` from options to setup syntax.
- Reworking the profile/own-post merge logic in `buildIndex`.
- Adding additional layer kinds (e.g. events). The schema's `MAP_LAYER_KINDS` tuple is the extension point if/when needed.
- Visual polish on the toggle's mount position — default is top-right overlay; revisit during review.
