# OsmPoiMap Performance Optimization — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate excessive re-renders and redundant API calls in the map-based profile browse view by applying six targeted fixes across four files.

**Architecture:** Fix the data flow cascade at each stage — debounce map events, suppress programmatic move emissions, parallelize API calls, diff markers instead of rebuilding, and cache fetched bounds data. All changes are frontend-only.

**Tech Stack:** Vue 3 Composition API, Pinia, Leaflet + leaflet.markercluster, Vitest

**Spec:** `docs/superpowers/specs/2026-03-17-osm-poi-map-performance-design.md`

---

## PR 1: Low-Hanging Fruits (Fixes #2, #3, #4, #6)

### Task 1: Remove `{ deep: true }` watcher on items

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue:458-464`
- Test: `apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts`

- [ ] **Step 1: Verify existing tests pass before changes**

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts`
Expected: All tests PASS

- [ ] **Step 2: Remove `{ deep: true }` from items watcher**

In `OsmPoiMap.vue`, change the items watcher (line ~458-464):

```ts
// BEFORE
watch(
  () => props.items,
  () => {
    updateMarkers()
  },
  { deep: true }
)

// AFTER
watch(
  () => props.items,
  () => {
    updateMarkers()
  }
)
```

The store replaces the entire `profileList` array on each fetch, which causes `mapPois` computed in `BrowseProfiles.vue` to produce a new array reference. A shallow reference watch is sufficient.

- [ ] **Step 3: Run tests to verify no regressions**

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue
git commit -m "perf(map): remove deep watcher on items prop"
```

---

### Task 2: Debounce `emitBounds` (300ms)

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue:114-128`
- Test: `apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts`

- [ ] **Step 1: Write test for debounced bounds emission**

Add to `OsmPoiMap.spec.ts`:

```ts
it('debounces bounds-changed emission on rapid moveend events', async () => {
  vi.useFakeTimers()
  const wrapper = await mountMap()
  await flushPromises()

  const mapInstance = (L.map as any).mock.results[0].value
  const moveendHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')[1]

  mapInstance.getBounds = vi.fn(() => ({
    getSouth: () => 45.0,
    getNorth: () => 48.0,
    getWest: () => 16.0,
    getEast: () => 23.0,
  }))

  // Fire moveend three times in quick succession
  moveendHandler()
  moveendHandler()
  moveendHandler()

  // Should NOT have emitted yet (debounce pending)
  expect(wrapper.emitted('bounds-changed')).toBeFalsy()

  // Advance past debounce delay
  vi.advanceTimersByTime(300)

  // Should have emitted exactly once
  expect(wrapper.emitted('bounds-changed')).toHaveLength(1)
  expect(wrapper.emitted('bounds-changed')![0]).toEqual([
    { south: 45.0, north: 48.0, west: 16.0, east: 23.0 },
  ])

  vi.useRealTimers()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts -t "debounces bounds-changed"`
Expected: FAIL — currently emits immediately on each moveend

- [ ] **Step 3: Implement debounced emitBounds**

In `OsmPoiMap.vue`, add a `boundsDebounceTimer` variable near the other `let` declarations (around line 49):

```ts
let boundsDebounceTimer: ReturnType<typeof setTimeout> | null = null
```

Replace the `emitBounds` function (line ~114-128):

```ts
function emitBounds() {
  if (boundsDebounceTimer) clearTimeout(boundsDebounceTimer)
  boundsDebounceTimer = setTimeout(() => {
    boundsDebounceTimer = null
    if (!map) return
    if (popupTarget.value) return
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) return
    const b = map.getBounds()
    emit('bounds-changed', {
      south: b.getSouth(),
      north: b.getNorth(),
      west: b.getWest(),
      east: b.getEast(),
    })
  }, 300)
}
```

Also clear the timer in `destroyMap()` (add after the `staggerTimer` cleanup):

```ts
if (boundsDebounceTimer) {
  clearTimeout(boundsDebounceTimer)
  boundsDebounceTimer = null
}
```

- [ ] **Step 4: Update the existing "emits bounds-changed on moveend" test**

The existing test `'emits bounds-changed on moveend with viewport bounds'` needs to advance fake timers. Update it:

```ts
it('emits bounds-changed on moveend with viewport bounds', async () => {
  vi.useFakeTimers()
  const wrapper = await mountMap()
  await flushPromises()

  const mapInstance = (L.map as any).mock.results[0].value
  const moveendHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')[1]

  mapInstance.getBounds = vi.fn(() => ({
    getSouth: () => 45.0,
    getNorth: () => 48.0,
    getWest: () => 16.0,
    getEast: () => 23.0,
  }))

  moveendHandler()
  vi.advanceTimersByTime(300)

  expect(wrapper.emitted('bounds-changed')).toBeTruthy()
  expect(wrapper.emitted('bounds-changed')![0]).toEqual([
    { south: 45.0, north: 48.0, west: 16.0, east: 23.0 },
  ])

  vi.useRealTimers()
})
```

Also update `'suppresses bounds-changed when container has zero dimensions'`:

```ts
it('suppresses bounds-changed when container has zero dimensions', async () => {
  vi.useFakeTimers()
  const wrapper = await mountMap()
  await flushPromises()

  const mapInstance = (L.map as any).mock.results[0].value
  const moveendHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')[1]

  mapInstance.getBounds = vi.fn(() => ({
    getSouth: () => 45.0,
    getNorth: () => 48.0,
    getWest: () => 16.0,
    getEast: () => 23.0,
  }))

  // Zero-size container — bounds-changed should be suppressed
  mapInstance.getSize.mockReturnValue({ x: 0, y: 0 })
  moveendHandler()
  vi.advanceTimersByTime(300)
  expect(wrapper.emitted('bounds-changed')).toBeFalsy()

  // Non-zero container — bounds-changed should fire
  mapInstance.getSize.mockReturnValue({ x: 1000, y: 800 })
  moveendHandler()
  vi.advanceTimersByTime(300)
  expect(wrapper.emitted('bounds-changed')).toBeTruthy()

  vi.useRealTimers()
})
```

- [ ] **Step 5: Run all OsmPoiMap tests**

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts
git commit -m "perf(map): debounce emitBounds at 300ms to reduce API calls during rapid pan/zoom"
```

---

### Task 3: Suppress bounds emission during programmatic map moves

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue`
- Test: `apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts`

- [ ] **Step 1: Write test for suppressed programmatic bounds**

Add to `OsmPoiMap.spec.ts`:

```ts
it('does not emit bounds-changed when fitBounds is triggered by updateMarkers', async () => {
  vi.useFakeTimers()
  const wrapper = await mountMap({ items: [] })
  await flushPromises()

  const mapInstance = (L.map as any).mock.results[0].value
  const moveendHandler = mapInstance.on.mock.calls.find((c: any) => c[0] === 'moveend')[1]

  mapInstance.getBounds = vi.fn(() => ({
    getSouth: () => 45.0,
    getNorth: () => 48.0,
    getWest: () => 16.0,
    getEast: () => 23.0,
  }))

  // Simulate items arriving (triggers updateMarkers → fitBounds → moveend)
  await wrapper.setProps({ items })
  await flushPromises()

  // The moveend from fitBounds should be suppressed
  moveendHandler()
  vi.advanceTimersByTime(300)

  expect(wrapper.emitted('bounds-changed')).toBeFalsy()

  vi.useRealTimers()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts -t "does not emit bounds-changed when fitBounds"`
Expected: FAIL

- [ ] **Step 3: Implement suppressBoundsEmit flag**

In `OsmPoiMap.vue`, add a flag near the other `let` declarations:

```ts
let suppressBoundsEmit = false
```

Update the debounced `emitBounds` to check the flag (add at the start of the setTimeout callback, before the existing guards):

```ts
function emitBounds() {
  if (boundsDebounceTimer) clearTimeout(boundsDebounceTimer)
  boundsDebounceTimer = setTimeout(() => {
    boundsDebounceTimer = null
    if (suppressBoundsEmit) return   // <-- add this line
    if (!map) return
    if (popupTarget.value) return
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) return
    const b = map.getBounds()
    emit('bounds-changed', {
      south: b.getSouth(),
      north: b.getNorth(),
      west: b.getWest(),
      east: b.getEast(),
    })
  }, 300)
}
```

In `updateMarkers()`, wrap the `fitBounds` call (line ~381-388):

```ts
// BEFORE
if ((props.fitToPois || !props.center) && props.items.length > 0) {
  const latlngs = props.items.map(
    (item) => [item.location.lat, item.location.lon] as [number, number]
  )
  const bounds = L.latLngBounds(latlngs)
  map.fitBounds(bounds, { padding: [24, 24] })
}

// AFTER
if ((props.fitToPois || !props.center) && props.items.length > 0) {
  const latlngs = props.items.map(
    (item) => [item.location.lat, item.location.lon] as [number, number]
  )
  const bounds = L.latLngBounds(latlngs)
  suppressBoundsEmit = true
  map.fitBounds(bounds, { padding: [24, 24] })
  map.once('moveend', () => {
    suppressBoundsEmit = false
  })
}
```

- [ ] **Step 4: Run all OsmPoiMap tests**

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts
git commit -m "perf(map): suppress bounds emission during programmatic fitBounds"
```

---

### Task 4: Parallel fetch for match IDs + map bounds profiles

**Files:**
- Modify: `apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts:39-44`
- Test: `apps/frontend/src/features/browse/composables/__tests__/useSocialMatchViewModel.spec.ts`

- [ ] **Step 1: Write test for parallel fetch**

Add to `useSocialMatchViewModel.spec.ts`:

```ts
it('fetches match IDs and map profiles in parallel when lastMapBounds exists', async () => {
  const bounds = { south: 45, north: 48, west: 16, east: 23 }
  mockFindProfileStore.lastMapBounds = bounds
  mockFindProfileStore.fetchDatingMatchIds = vi.fn().mockResolvedValue(undefined)
  mockFindProfileStore.findProfilesForMapBounds = vi.fn().mockResolvedValue({ success: true })

  const vm = useSocialMatchViewModel()

  // Track call order via timestamps
  let matchIdsCallTime = 0
  let boundsCallTime = 0
  mockFindProfileStore.fetchDatingMatchIds = vi.fn(() => {
    matchIdsCallTime = Date.now()
    return Promise.resolve()
  })
  mockFindProfileStore.findProfilesForMapBounds = vi.fn(() => {
    boundsCallTime = Date.now()
    return Promise.resolve({ success: true })
  })

  await vm.initialize()

  // Both should have been called
  expect(mockFindProfileStore.fetchDatingMatchIds).toHaveBeenCalled()
  expect(mockFindProfileStore.findProfilesForMapBounds).toHaveBeenCalledWith(bounds)

  // They should start at roughly the same time (parallel, not sequential)
  // In sync mock context, both start in the same microtask
  expect(Math.abs(matchIdsCallTime - boundsCallTime)).toBeLessThan(5)

  mockFindProfileStore.lastMapBounds = null
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/browse/composables/__tests__/useSocialMatchViewModel.spec.ts -t "fetches match IDs and map profiles in parallel"`
Expected: FAIL — currently they are sequential (await one then the other)

- [ ] **Step 3: Implement parallel fetch**

In `useSocialMatchViewModel.ts`, change `fetchResults`:

```ts
// BEFORE
const fetchResults = async () => {
  await findProfileStore.fetchDatingMatchIds()
  if (findProfileStore.lastMapBounds) {
    await findProfileStore.findProfilesForMapBounds(findProfileStore.lastMapBounds)
  }
}

// AFTER
const fetchResults = async () => {
  await Promise.all([
    findProfileStore.fetchDatingMatchIds(),
    findProfileStore.lastMapBounds
      ? findProfileStore.findProfilesForMapBounds(findProfileStore.lastMapBounds)
      : Promise.resolve(),
  ])
}
```

- [ ] **Step 4: Run all viewmodel tests**

Run: `pnpm --filter frontend exec vitest run src/features/browse/composables/__tests__/useSocialMatchViewModel.spec.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts apps/frontend/src/features/browse/composables/__tests__/useSocialMatchViewModel.spec.ts
git commit -m "perf(browse): parallelize match IDs and map bounds API calls"
```

---

### Task 5: Run full test suite and format

- [ ] **Step 1: Run full frontend test suite**

Run: `pnpm --filter frontend test`
Expected: All tests PASS

- [ ] **Step 2: Format changed files**

```bash
pnpm exec prettier --write \
  apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue \
  apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts \
  apps/frontend/src/features/browse/composables/useSocialMatchViewModel.ts \
  apps/frontend/src/features/browse/composables/__tests__/useSocialMatchViewModel.spec.ts
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: No type errors

- [ ] **Step 4: Commit formatting if any changes**

```bash
git add -u
git commit -m "style: format changed files"
```

---

## PR 2: Structural Optimizations (Fixes #1, #5, #7)

### Task 6: Diff-based `updateMarkers()` in OsmPoiMap

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue:346-388`
- Test: `apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts`

- [ ] **Step 1: Write tests for diff-based marker update**

Add to `OsmPoiMap.spec.ts`:

```ts
describe('diff-based updateMarkers', () => {
  it('adds only new markers without clearing existing ones on items update', async () => {
    const wrapper = await mountMap({ items: [items[0]] })
    await flushPromises()

    // Initial: 1 marker created
    const initialMarkerCount = (L.marker as any).mock.calls.length
    expect(initialMarkerCount).toBe(1)

    const clusterInstance = (L as any).markerClusterGroup.mock.results[0].value

    // Update: add one more item
    await wrapper.setProps({ items: [items[0], items[1]] })
    await flushPromises()

    // Should have created only 1 additional marker (not cleared + rebuilt 2)
    expect((L.marker as any).mock.calls.length).toBe(initialMarkerCount + 1)
    // removeLayers should NOT have been called (no items removed)
    // addLayers should have been called with batch containing only the new marker
    expect(clusterInstance.addLayers).toHaveBeenCalled()
  })

  it('removes stale markers when items are removed', async () => {
    const wrapper = await mountMap({ items: [items[0], items[1]] })
    await flushPromises()

    const clusterInstance = (L as any).markerClusterGroup.mock.results[0].value

    // Remove the second item
    await wrapper.setProps({ items: [items[0]] })
    await flushPromises()

    expect(clusterInstance.removeLayers).toHaveBeenCalled()
  })

  it('updates marker icon in place when highlighted changes', async () => {
    const item0 = { ...items[0], highlighted: false }
    const wrapper = await mountMap({ items: [item0] })
    await flushPromises()

    const markerInstance = (L.marker as any).mock.results[0].value

    // Change highlighted flag
    const item0Highlighted = { ...items[0], highlighted: true }
    await wrapper.setProps({ items: [item0Highlighted] })
    await flushPromises()

    // Marker should have been updated in-place via setIcon, not recreated
    expect(markerInstance.setIcon).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts -t "diff-based updateMarkers"`
Expected: FAIL — currently clears and rebuilds all

- [ ] **Step 3: Implement diff-based updateMarkers**

Replace `updateMarkers()` in `OsmPoiMap.vue`:

```ts
function updateMarkers() {
  if (!map || !clusterGroup || !isMapReady) return
  const size = map.getSize()
  if (size.x === 0 || size.y === 0) return
  if (staggerTimer) {
    clearTimeout(staggerTimer)
    staggerTimer = null
  }

  const incoming = new Map<string | number, MapPoi>()
  for (const item of props.items) {
    incoming.set(item.id, item)
  }

  const toRemove: LMarker[] = []
  // Remove markers no longer in the incoming list
  for (const [id, marker] of markers) {
    if (!incoming.has(id)) {
      toRemove.push(marker)
      markers.delete(id)
      itemsById.delete(id)
    }
  }

  const toAdd: LMarker[] = []
  // Add new markers or update existing
  for (const [id, item] of incoming) {
    const existing = itemsById.get(id)
    if (!existing) {
      // New item — create marker
      const marker = createMarker(item)
      markers.set(id, marker)
      itemsById.set(id, item)
      toAdd.push(marker)
    } else if (
      existing.highlighted !== item.highlighted ||
      existing.image !== item.image
    ) {
      // Changed item — update icon in-place
      const marker = markers.get(id)!
      marker.setIcon(
        hydratePoiIcon(props.iconComponent, {
          image: item.image,
          isSelected: id === props.selectedId,
          isHighlighted: item.highlighted ?? false,
        })
      )
      itemsById.set(id, item)
    }
  }

  if (toRemove.length) clusterGroup.removeLayers(toRemove)
  if (toAdd.length) clusterGroup.addLayers(toAdd)

  // Only fitBounds when markers first appear (initial load)
  if (
    toAdd.length > 0 &&
    toRemove.length === 0 &&
    markers.size === toAdd.length &&
    (props.fitToPois || !props.center) &&
    props.items.length > 0
  ) {
    const latlngs = props.items.map(
      (item) => [item.location.lat, item.location.lon] as [number, number]
    )
    const bounds = L.latLngBounds(latlngs)
    suppressBoundsEmit = true
    map.fitBounds(bounds, { padding: [24, 24] })
    map.once('moveend', () => {
      suppressBoundsEmit = false
    })
  }
}
```

Also add `removeLayers` to the mock clusterGroup in the test file. In `OsmPoiMap.spec.ts`, update the `markerClusterGroup` mock (line ~88-97) to include `removeLayers`:

```ts
const markerClusterGroup = vi.fn(() => ({
  ...clusterGroupProto,
  addLayer: vi.fn(),
  addLayers: vi.fn(),
  clearLayers: vi.fn(),
  removeLayers: vi.fn(),    // <-- add this
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  getBounds: vi.fn(() => ({})),
  options: {},
}))
```

- [ ] **Step 4: Update existing tests that assume clearLayers + full rebuild**

Some existing tests (e.g., `'creates markers for items'`) may need adjustment since the diff-based approach doesn't call `clearLayers` on updates. Review each failing test and update assertions to match the new diff behavior. The `onActivated` handler should still do a full rebuild — add a `forceRebuild` parameter to `updateMarkers` for that case:

```ts
function updateMarkers(forceRebuild = false) {
  if (!map || !clusterGroup || !isMapReady) return
  const size = map.getSize()
  if (size.x === 0 || size.y === 0) return
  if (staggerTimer) {
    clearTimeout(staggerTimer)
    staggerTimer = null
  }

  if (forceRebuild) {
    clusterGroup.clearLayers()
    markers.clear()
    itemsById.clear()
  }

  // ... rest of diff logic
}
```

Update `onActivated` and `onMapReady` to use `updateMarkers(true)`.

- [ ] **Step 5: Run all OsmPoiMap tests**

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts
git commit -m "perf(map): diff-based marker update instead of clear+rebuild"
```

---

### Task 7: Icon render caching in `hydratePoiIcon`

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/mapUtils.ts:27-39`
- Test: `apps/frontend/src/features/shared/components/osmPoiMap/__tests__/mapUtils.spec.ts`

- [ ] **Step 1: Write test for icon caching**

Add to `mapUtils.spec.ts`. First add the import for `hydratePoiIcon` and a dummy component:

```ts
import { defineComponent, h } from 'vue'
import { hydratePoiIcon, clearIconCache } from '../mapUtils'

const DummyIcon = defineComponent({
  props: ['image', 'isSelected', 'isHighlighted'],
  render() {
    return h('img', { src: 'test.jpg' })
  },
})

describe('hydratePoiIcon', () => {
  it('returns cached icon for identical props', () => {
    const props = { image: { variants: [{ size: 'thumb' as const, url: 'a.jpg' }], blurhash: null }, isSelected: false, isHighlighted: false }
    const icon1 = hydratePoiIcon(DummyIcon, props)
    const icon2 = hydratePoiIcon(DummyIcon, props)
    expect(icon1).toBe(icon2) // same reference = cache hit
  })

  it('returns different icon when highlighted changes', () => {
    const base = { image: { variants: [{ size: 'thumb' as const, url: 'a.jpg' }], blurhash: null }, isSelected: false }
    const icon1 = hydratePoiIcon(DummyIcon, { ...base, isHighlighted: false })
    const icon2 = hydratePoiIcon(DummyIcon, { ...base, isHighlighted: true })
    expect(icon1).not.toBe(icon2)
  })

  it('clearIconCache empties the cache', () => {
    const props = { image: { variants: [{ size: 'thumb' as const, url: 'a.jpg' }], blurhash: null }, isSelected: false, isHighlighted: false }
    const icon1 = hydratePoiIcon(DummyIcon, props)
    clearIconCache()
    const icon2 = hydratePoiIcon(DummyIcon, props)
    expect(icon1).not.toBe(icon2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/mapUtils.spec.ts -t "hydratePoiIcon"`
Expected: FAIL — `clearIconCache` doesn't exist, icons are not cached

- [ ] **Step 3: Implement icon caching**

In `mapUtils.ts`, update `hydratePoiIcon` and add `clearIconCache`:

```ts
const iconCache = new Map<string, L.DivIcon>()

function getIconCacheKey(props: PoiIconProps): string {
  const url = props.image?.variants?.[0]?.url ?? 'none'
  return `${url}_${props.isSelected}_${props.isHighlighted}`
}

/** Renders a Vue component into a Leaflet DivIcon for use as a POI marker. Caches by image+state. */
export function hydratePoiIcon(component: Component, iconProps: PoiIconProps): L.DivIcon {
  const key = getIconCacheKey(iconProps)
  const cached = iconCache.get(key)
  if (cached) return cached

  const container = document.createElement('span')
  render(h(component, iconProps), container)
  const icon = L.divIcon({
    className: 'poi-avatar-icon',
    html: container,
    iconSize: [POI_ICON_SIZE, POI_ICON_SIZE],
    iconAnchor: [POI_ICON_SIZE / 2, POI_ICON_SIZE / 2],
  })
  iconCache.set(key, icon)
  return icon
}

/** Clears the icon cache. Call on component unmount to prevent memory leaks. */
export function clearIconCache(): void {
  iconCache.clear()
}
```

In `OsmPoiMap.vue`, import `clearIconCache` and call it in `destroyMap()`:

```ts
import { isValidLatLng, computeViewportMultiplier, createClusterIcon, hydratePoiIcon, clearIconCache } from './mapUtils'

// In destroyMap():
clearIconCache()
```

- [ ] **Step 4: Run all mapUtils tests**

Run: `pnpm --filter frontend exec vitest run src/features/shared/components/osmPoiMap/__tests__/mapUtils.spec.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/mapUtils.ts apps/frontend/src/features/shared/components/osmPoiMap/__tests__/mapUtils.spec.ts apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue
git commit -m "perf(map): cache hydratePoiIcon results by image URL and state"
```

---

### Task 8: Expanding-bounds cache in findProfileStore

**Files:**
- Modify: `apps/frontend/src/features/browse/stores/findProfileStore.ts`
- Test: `apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts`

- [ ] **Step 1: Write tests for bounds caching**

Add to `findProfileStore.spec.ts`:

```ts
describe('findProfileStore bounds caching', () => {
  let store: ReturnType<typeof useFindProfileStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useFindProfileStore()
    vi.clearAllMocks()
  })

  const mockProfile = {
    id: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
    publicName: 'Alice',
    languages: [],
    isDatingActive: false,
    location: { country: 'HU', lat: 47, lon: 19 },
    profileImages: [],
    tags: [],
  }

  it('skips API call when requested bounds are within cached bounds', async () => {
    mockGet.mockResolvedValueOnce({ data: { profiles: [mockProfile] } })

    // First fetch — establishes cache
    const largeBounds = { south: 40, north: 50, west: 10, east: 30 }
    await store.findProfilesForMapBounds(largeBounds)
    expect(mockGet).toHaveBeenCalledTimes(1)
    mockGet.mockClear()

    // Second fetch with smaller bounds inside the cached area — should skip API
    const smallBounds = { south: 44, north: 48, west: 14, east: 24 }
    await store.findProfilesForMapBounds(smallBounds)
    expect(mockGet).not.toHaveBeenCalled()
    expect(store.profileList).toHaveLength(1) // still has Alice from cache
  })

  it('fetches from API when bounds extend beyond cached area', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    // First fetch
    const bounds1 = { south: 45, north: 48, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds1)
    mockGet.mockClear()

    // Second fetch outside cached area
    const bounds2 = { south: 35, north: 40, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds2)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache on teardown', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds)
    mockGet.mockClear()

    store.teardown()

    // After teardown, same bounds should trigger API call
    mockGet.mockResolvedValue({ data: { profiles: [] } })
    await store.findProfilesForMapBounds(bounds)
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache on refreshAfterDatingPrefsUpdate', async () => {
    mockGet.mockResolvedValue({ data: { profiles: [mockProfile], ids: [] } })

    const bounds = { south: 45, north: 48, west: 16, east: 23 }
    await store.findProfilesForMapBounds(bounds)
    mockGet.mockClear()

    mockGet.mockResolvedValue({ data: { profiles: [], ids: [] } })
    store.lastMapBounds = bounds
    await store.refreshAfterDatingPrefsUpdate()

    // Should have re-fetched (cache invalidated)
    expect(mockGet).toHaveBeenCalledWith('/find/social/map/bounds', expect.anything())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run src/features/browse/stores/__tests__/findProfileStore.spec.ts -t "bounds caching"`
Expected: FAIL

- [ ] **Step 3: Implement expanding-bounds cache**

In `findProfileStore.ts`, add cache state and helper functions:

```ts
// Add outside the store definition, near mapBoundsAbortController
let cachedProfiles = new Map<string, PublicProfile>()
let cachedBounds: MapBounds | null = null

function boundsContain(outer: MapBounds, inner: MapBounds): boolean {
  return (
    outer.south <= inner.south &&
    outer.north >= inner.north &&
    outer.west <= inner.west &&
    outer.east >= inner.east
  )
}

function padBounds(bounds: MapBounds, factor: number): MapBounds {
  const latPad = (bounds.north - bounds.south) * factor
  const lonPad = (bounds.east - bounds.west) * factor
  return {
    south: bounds.south - latPad,
    north: bounds.north + latPad,
    west: bounds.west - lonPad,
    east: bounds.east + lonPad,
  }
}

function unionBounds(a: MapBounds, b: MapBounds): MapBounds {
  return {
    south: Math.min(a.south, b.south),
    north: Math.max(a.north, b.north),
    west: Math.min(a.west, b.west),
    east: Math.max(a.east, b.east),
  }
}

function profileInBounds(profile: PublicProfile, bounds: MapBounds): boolean {
  const lat = profile.location?.lat
  const lon = profile.location?.lon
  if (lat == null || lon == null) return false
  return lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east
}

function invalidateBoundsCache(): void {
  cachedProfiles.clear()
  cachedBounds = null
}
```

Update `findProfilesForMapBounds`:

```ts
async findProfilesForMapBounds(
  bounds: MapBounds
): Promise<StoreResponse<StoreVoidSuccess | StoreError>> {
  if (mapBoundsAbortController) {
    mapBoundsAbortController.abort()
  }
  this.lastMapBounds = bounds

  // Cache hit — filter locally
  if (cachedBounds && boundsContain(cachedBounds, bounds)) {
    this.profileList = [...cachedProfiles.values()].filter((p) =>
      profileInBounds(p, bounds)
    )
    return storeSuccess()
  }

  const controller = new AbortController()
  mapBoundsAbortController = controller

  try {
    this.isLoading = true
    this.hasMoreProfiles = false

    const paddedBounds = padBounds(bounds, 0.3)
    const res = await api.get<GetProfilesResponse>('/find/social/map/bounds', {
      params: paddedBounds,
      signal: controller.signal,
    })
    const fetched = PublicProfileArraySchema.parse(res.data.profiles)

    // Merge into cache
    for (const p of fetched) {
      cachedProfiles.set(p.id, p)
    }
    cachedBounds = cachedBounds ? unionBounds(cachedBounds, paddedBounds) : paddedBounds

    // Display only profiles within the actual requested bounds
    this.profileList = [...cachedProfiles.values()].filter((p) =>
      profileInBounds(p, bounds)
    )

    return storeSuccess()
  } catch (error: any) {
    if (error instanceof CanceledError) {
      return storeSuccess()
    }
    this.profileList = []
    return storeError(error, 'Failed to fetch bounded map profiles')
  } finally {
    if (mapBoundsAbortController === controller) {
      this.isLoading = false
    }
  }
},
```

Update `refreshAfterDatingPrefsUpdate` to invalidate cache:

```ts
async refreshAfterDatingPrefsUpdate(): Promise<void> {
  invalidateBoundsCache()
  await this.fetchDatingMatchIds()
  if (this.lastMapBounds) {
    await this.findProfilesForMapBounds(this.lastMapBounds)
  }
},
```

Update `teardown` to invalidate cache:

```ts
teardown() {
  if (mapBoundsAbortController) {
    mapBoundsAbortController.abort()
    mapBoundsAbortController = null
  }
  invalidateBoundsCache()
  this.profileList = []
  this.matchedProfileIds = new Set()
  this.lastMapBounds = null
  this.isLoading = false
  this.isLoadingMore = false
  this.hasMoreProfiles = true
  this.currentPage = 0
},
```

- [ ] **Step 4: Update existing store test for padded bounds**

The existing test `'calls the bounded map endpoint with bounds params'` needs to account for padded bounds being sent to the API:

```ts
it('calls the bounded map endpoint with padded bounds params', async () => {
  mockGet.mockResolvedValue({ data: { profiles: [mockProfile] } })

  await store.findProfilesForMapBounds(bounds)

  // API receives 30% padded bounds
  expect(mockGet).toHaveBeenCalledWith(
    '/find/social/map/bounds',
    expect.objectContaining({
      params: {
        south: bounds.south - (bounds.north - bounds.south) * 0.3,
        north: bounds.north + (bounds.north - bounds.south) * 0.3,
        west: bounds.west - (bounds.east - bounds.west) * 0.3,
        east: bounds.east + (bounds.east - bounds.west) * 0.3,
      },
      signal: expect.any(AbortSignal),
    })
  )
})
```

- [ ] **Step 5: Run all store tests**

Run: `pnpm --filter frontend exec vitest run src/features/browse/stores/__tests__/findProfileStore.spec.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/features/browse/stores/findProfileStore.ts apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts
git commit -m "perf(browse): add expanding-bounds cache for map profile fetches"
```

---

### Task 9: Run full test suite and format for PR 2

- [ ] **Step 1: Run full frontend test suite**

Run: `pnpm --filter frontend test`
Expected: All tests PASS

- [ ] **Step 2: Format changed files**

```bash
pnpm exec prettier --write \
  apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue \
  apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts \
  apps/frontend/src/features/shared/components/osmPoiMap/mapUtils.ts \
  apps/frontend/src/features/shared/components/osmPoiMap/__tests__/mapUtils.spec.ts \
  apps/frontend/src/features/browse/stores/findProfileStore.ts \
  apps/frontend/src/features/browse/stores/__tests__/findProfileStore.spec.ts
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: No type errors

- [ ] **Step 4: Commit formatting if any changes**

```bash
git add -u
git commit -m "style: format changed files"
```

- [ ] **Step 5: Run full CI suite**

Run: `pnpm run ci:test`
Expected: All checks PASS
