# OsmPoiMap Performance Optimization

## Problem

The map-based profile browse view suffers from excessive re-renders and redundant API calls as data grows. Every bounds change triggers a full marker teardown+rebuild, deep watchers traverse the entire items array on each reactive tick, and two sequential API calls (bounds profiles + match IDs) each trigger separate render cycles.

## Scope

Two PRs:
1. **Low-hanging fruits** — fixes #2, #3, #4, #6 (trivial to low effort)
2. **Structural optimizations** — fixes #1, #5, #7 (medium effort)

All changes are in the frontend only. No backend changes.

## Design

### Fix 1: Diff-based `updateMarkers()` (PR 2)

**File:** `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue`

Replace the current `clearLayers()` + rebuild-all approach with a diff algorithm:
- Build a `Map<id, MapPoi>` from incoming items
- Compare against existing `markers` / `itemsById` maps
- Remove markers whose IDs are gone (`clusterGroup.removeLayers(toRemove)`)
- Add markers whose IDs are new (`clusterGroup.addLayers(toAdd)`)
- Update in-place markers whose `highlighted` or `image` changed (`marker.setIcon(...)`)
- Only call `fitBounds` when items appear for the first time (not on every update)

This eliminates O(n) DOM teardown + Vue `render(h(...))` calls per fetch.

### Fix 2: Remove `{ deep: true }` watch on items (PR 1)

**File:** `OsmPoiMap.vue` line 458-464

Change:
```ts
watch(() => props.items, () => { updateMarkers() }, { deep: true })
```
To:
```ts
watch(() => props.items, () => { updateMarkers() })
```

The store replaces the entire `profileList` array on each fetch, so a shallow reference watch is sufficient. The `highlighted` flag changes are driven by `matchedProfileIds` which causes `mapPois` computed to produce a new array reference anyway.

### Fix 3: Parallel fetch with `Promise.all` (PR 1)

**File:** `apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts`

Change `fetchResults()` from sequential:
```ts
await findProfileStore.fetchDatingMatchIds()
await findProfileStore.findProfilesForMapBounds(...)
```
To parallel:
```ts
await Promise.all([
  findProfileStore.fetchDatingMatchIds(),
  findProfileStore.lastMapBounds
    ? findProfileStore.findProfilesForMapBounds(findProfileStore.lastMapBounds)
    : Promise.resolve()
])
```

Both API responses settle in the same microtask, so Vue batches the two state updates into a single render cycle.

### Fix 4: Suppress bounds emit during programmatic map moves (PR 1)

**File:** `OsmPoiMap.vue`

Add a `suppressBoundsEmit` flag. Set it `true` before `fitBounds` / `flyTo` inside `updateMarkers()`, clear it on the subsequent `moveend`. This breaks the cascade: fetch data -> updateMarkers -> fitBounds -> moveend -> emitBounds -> fetch again.

### Fix 5: Icon render caching (PR 2)

**File:** `apps/frontend/src/features/shared/components/osmPoiMap/mapUtils.ts`

Cache `L.DivIcon` instances by a composite key of `imageUrl + isSelected + isHighlighted`. Most markers share the same state across renders, so this avoids redundant `render(h(component, props), container)` calls. Invalidate the cache on component unmount to prevent memory leaks.

### Fix 6: Debounce `emitBounds` (PR 1)

**File:** `OsmPoiMap.vue`

Wrap the `emitBounds` logic in a 300ms debounce so rapid successive pan/zoom gestures collapse into a single API call. Use a plain `setTimeout`/`clearTimeout` pattern (no external dependency needed since this is inside a non-reactive Leaflet event handler).

### Fix 7: Expanding-bounds cache in the store (PR 2)

**File:** `apps/frontend/src/features/browse/stores/findProfileStore.ts`

Track a `cachedBounds` (union of all previously fetched regions) and a `cachedProfiles` map. On each `findProfilesForMapBounds` call:
1. If `cachedBounds` fully contains the requested bounds, filter `cachedProfiles` locally — no API call.
2. Otherwise, fetch with 30% padded bounds, merge results into `cachedProfiles`, expand `cachedBounds`.
3. Invalidate cache on preference changes (`refreshAfterDatingPrefsUpdate`) and `teardown`.

## Files Modified

| File | Fixes |
|------|-------|
| `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue` | #1, #2, #4, #6 |
| `apps/frontend/src/features/shared/components/osmPoiMap/mapUtils.ts` | #5 |
| `apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts` | #3 |
| `apps/frontend/src/features/browse/stores/findProfileStore.ts` | #7 |

## Testing

- Existing tests must pass (no behavioral change)
- Add/update tests for:
  - Diff-based `updateMarkers` (add, remove, update-in-place scenarios)
  - Icon cache hit/miss/invalidation
  - Bounds cache containment logic and invalidation
  - `sameBounds` + debounce interaction
  - Parallel fetch (verify single render cycle via spy on `updateMarkers`)

## Risks

- **Diff-based markers:** Must handle edge cases where Leaflet marker state diverges from `itemsById` (e.g., after KeepAlive reactivation). Mitigate by keeping `onActivated` as a full rebuild fallback.
- **Bounds cache:** Stale data if profiles are created/updated/deleted while user browses. Acceptable for social browsing (not real-time critical). Cache is invalidated on preference changes and logout.
- **Icon cache:** Memory growth bounded by number of unique avatar URLs. Cache cleared on component unmount.
