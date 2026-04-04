# OsmPoiMap Refactor — Design Spec

**Date:** 2026-04-04  
**Branch:** feat/browse-refactor-plan-4  
**Status:** Approved

---

## Context

`OsmPoiMap.vue` is a 525-line Leaflet map component (plus 190 lines of scoped CSS) with several structural problems that are the root source of its bugs:

1. **Scattered lifecycle** — map init/teardown is split across `ensureMap`, `destroyMap`, `onMounted`, `onBeforeUnmount`, `onActivated` with duplicated `if (!map) return` null-checks throughout.
2. **Two unrelated marker systems** — POI markers (`pointLayer` + OMS) and cluster markers (`clusterLayer`) each have their own add/remove/update diffing loop with no shared abstraction.
3. **13 module-level `let` vars** — no grouping, half are timing-band-aid flags.
4. **Race-condition flags as state** — `suppressBoundsEmit`, `pendingCenter`, `pendingSpiderfyLatLng`, `isMapReady` patch timing problems between map init, tile load, KeepAlive reactivation, and data updates; each flag adds conditionals across multiple functions.
5. **Spiderfy cross-function coordination** — `pendingSpiderfyLatLng` is written by the cluster click handler and consumed by `updateMarkers`, making both functions secretly coupled via a shared mutable variable.

`MapView.vue` is a thin wrapper that adds a redundant second debounce (500ms on top of 300ms) and `isPlaceholderAnimated` prop — it exists only because the original component was underdebounced.

---

## Goals

- Eliminate all timing flags by replacing them with an explicit state machine + deferred work queue.
- Collapse the two parallel marker diffing loops into one `DiffableLayer<T>` abstraction.
- Move all Leaflet state into a plain TS `MapController` class (no Vue) so it can be tested without mounting a component.
- Thin the Vue component down to template + lifecycle delegation.
- Retire `MapView.vue` by merging its debounce into `OsmPoiMap`.
- Clean up the public API: remove `selectedId`, remove unused `highlightedPoiId`, rename `bounds-changed` → `bounds:changed`.
- **Popup on hover only:** marker `mouseover` → `openPopup()`. OMS `click` always emits `item:select` — never opens popup. Removes the popup-suppresses-bounds-changed guard entirely.
- **No flyTo on selection:** `highlightSelected()` is deleted along with `selectedId`. No programmatic zoom or popup open on external selection — callers use `item.highlighted` for visual state and `flyToMarker()` for navigation.

---

## File Structure

```txt
apps/frontend/src/features/shared/components/osmPoiMap/
  MapController.ts      # NEW — plain TS class, no Vue
  useMapController.ts   # NEW — thin Vue composable bridge (~40 lines)
  OsmPoiMap.vue         # MODIFIED — thin component; MapView merged in
  OsmPoiMap.types.ts    # MODIFIED — updated public API types
  mapUtils.ts           # UNCHANGED

apps/frontend/src/features/shared/components/
  MapView.vue           # DELETED
```

---

## Architecture

### `MapController` (plain TS, no Vue)

Owns all imperative Leaflet state. The Vue component never touches Leaflet objects directly.

```typescript
type MapPhase = 'uninitialized' | 'loading' | 'ready' | 'suspended'

interface DeferredWork {
  center?: [number, number]
  spiderfyAt?: L.LatLng
}

interface MapConfig {
  center?: [number, number]
  zoom: number
  tileUrl: string | undefined
  attribution: string | undefined
  boundsDebounce: number
}

interface MapCallbacks {
  onBoundsChanged: (payload: BoundsWithZoom) => void
  onItemSelect: (id: string | number) => void
  onMapReady: (map: LMap) => void
  onPopupOpen: (item: MapPoi, target: HTMLElement) => void
  onPopupClose: () => void
}

class MapController {
  private phase: MapPhase = 'uninitialized'
  private deferred: DeferredWork = {}

  // Leaflet objects (valid after init())
  private map!: LMap
  private oms!: OverlappingMarkerSpiderfier
  private pois!: DiffableLayer<MapPoi>
  private clusters!: DiffableLayer<MapCluster>
  private iconCache = new Map<string, L.DivIcon>()
  private resizeObserver!: ResizeObserver
  private boundsTimer: ReturnType<typeof setTimeout> | null = null
  private dissolvedClusterAt: L.LatLng | null = null

  constructor(el: HTMLDivElement, config: MapConfig, callbacks: MapCallbacks)

  // Lifecycle — called by useMapController
  init(): void         // uninitialized → loading → ready; drains deferred
  destroy(): void      // full teardown
  reactivate(): void   // suspended → ready; invalidateSize; drains deferred
  suspend(): void      // ready → suspended

  // Data updates — called by prop watchers
  updateMarkers(items: MapPoi[], config: MarkerConfig): void
  updateClusters(clusters: MapCluster[]): void

  // Imperative commands
  flyToCenter(center: [number, number]): void   // queues if not ready
  flyToMarker(poi: MapPoi): void
}
```

### State machine

```txt
uninitialized ──init()──► loading ──tiles:load──► ready ◄──reactivate()── suspended
                                                    │                           │
                                                    └────────suspend()──────────┘
```

- **`uninitialized → loading`** — `init()` creates the Leaflet map and begins tile load.
- **`loading → ready`** — tile layer fires `load` (or immediately if `tileUrl` is empty). All deferred work is drained.
- **`ready → suspended`** — `suspend()` is called by `onDeactivated` (KeepAlive hide).
- **`suspended → ready`** — `reactivate()` calls `map.invalidateSize()`, then drains deferred work.

**Drain pattern:** Every method that requires `ready` checks `this.phase` first. If not ready, it writes into `this.deferred`. On each `→ ready` transition the controller calls `this.drainDeferred()` once.

### `DiffableLayer<T>` (internal class)

A generic add/remove/update diffing layer. Instantiated twice — once for POI markers, once for cluster markers — with different factory callbacks. The structural diffing logic exists once.

```typescript
class DiffableLayer<T extends { id: string | number }> {
  constructor(
    layer: L.LayerGroup,
    fns: {
      create: (item: T) => LMarker
      shouldUpdate: (prev: T, next: T) => boolean
      apply: (marker: LMarker, item: T) => void
    }
  )

  update(incoming: T[]): { added: LMarker[]; removed: LMarker[] }
  clear(): void
  get(id: string | number): LMarker | undefined
  values(): IterableIterator<LMarker>
}
```

### `useMapController` (Vue composable, ~40 lines)

Bridges Vue lifecycle and prop reactivity to `MapController`. Contains no Leaflet logic.

```typescript
export function useMapController(
  mapEl: Ref<HTMLDivElement | null>,
  props: MapProps,
  emit: MapEmits
): { flyToMarker: (poi: MapPoi) => void }
```

Internally:
- `onMounted` → `new MapController(mapEl.value, config, callbacks).init()`
- `onBeforeUnmount` → `controller.destroy()`
- `onActivated` → `controller.reactivate()`
- `onDeactivated` → `controller.suspend()`
- `watch(props.items)` → `controller.updateMarkers(...)`
- `watch(props.clusters)` → `controller.updateClusters(...)`
- `watch(props.center)` → `controller.flyToCenter(...)`

### `OsmPoiMap.vue` (thin component)

```vue
<script setup>
const mapEl = ref<HTMLDivElement | null>(null)
const backdropPaneEl = ref<HTMLElement | null>(null)
const popupTarget = ref<HTMLElement | null>(null)
const popupItem = ref<MapPoi | null>(null)

const { flyToMarker } = useMapController(mapEl, props, emit)
defineExpose({ flyToMarker })
</script>

<template>
  <div class="osm-poi-map-wrapper">
    <div ref="mapEl" class="osm-poi-map" />
    <!-- Teleport: backdrop pane -->
    <!-- Teleport: popup component -->
  </div>
</template>
```

---

## Race Condition Eliminations

### `suppressBoundsEmit` → removed

Unregister/re-register the `moveend` listener around `fitBounds`:

```typescript
this.map.off('moveend', this.emitBounds)
this.map.fitBounds(bounds, { padding: [24, 24] })
this.map.once('moveend', () => this.map.on('moveend', this.emitBounds))
```

No flag. No two-consumer coordination. No silent loss.

The `popupTarget` guard (`if (popupTarget.value) return` inside `emitBounds`) is also removed. With hover-triggered popups, autopan no longer causes problematic refetches — the parent decides what to do with `bounds:changed`.

### `pendingCenter` → `deferred.center`

`flyToCenter()` writes `this.deferred.center` if phase is not `ready`. `drainDeferred()` calls `flyTo` when phase transitions to `ready`. Also handled by ResizeObserver (zero → non-zero size on KeepAlive restore) without a separate flag.

### `isMapReady` → `phase === 'ready'`

One source of truth. All `if (!isMapReady) return` guards become `if (this.phase !== 'ready') return` or write to `deferred`.

### `pendingSpiderfyLatLng` → `dissolvedClusterAt`

Cluster click handler at max-zoom sets `this.dissolvedClusterAt`. End of `updateMarkers`, after the POI layer diff completes, checks and clears it:

```typescript
if (this.dissolvedClusterAt) {
  const target = this.dissolvedClusterAt
  this.dissolvedClusterAt = null
  setTimeout(() => this.triggerSpiderfy(target), 0)
}
```

Single owner, single field on the class, one writer, one reader — explicit and auditable.

---

## Interaction Model

| Gesture                      | Behaviour                                          |
|------------------------------|----------------------------------------------------|
| Hover over marker (desktop)  | `mouseover` → `marker.openPopup()`                 |
| Click / tap marker           | OMS `click` → emit `item:select`, never opens popup  |

`highlightSelected()` and its `map.setView()` + `openPopup()` calls are deleted entirely. External selection state (e.g. active offcanvas item) is communicated back to the map only via `item.highlighted = true` on the `MapPoi` data, which updates the icon in-place through `DiffableLayer.shouldUpdate`. Programmatic navigation uses `flyToMarker()`.

The backdrop pane and `closeActivePopup` are also removed — they existed solely to prevent OMS unspiderfy when clicking while a popup was open. With popup on hover, that problem does not arise.

---

## Public API Changes

### Props

| Prop | Change |
|------|--------|
| `selectedId` | **Removed.** Selection state is external. Callers use `item.highlighted` for visual distinction. |
| `highlightedPoiId` | **Removed.** Was declared but never read by any script logic — dead prop. |
| `boundsDebounce` | **Added** (`number`, default `500`). Replaces the two-level debounce (300ms in OsmPoiMap + 500ms in MapView). |
| All other props | Unchanged |

### Emits

| Event | Change |
|-------|--------|
| `bounds-changed` | **Renamed** to `bounds:changed` (consistent with `item:select`, `map:ready`) |
| `item:select` | Unchanged |
| `map:ready` | Unchanged |

### Expose

| Method | Change |
|--------|--------|
| `flyToMarker(poi)` | Unchanged |

### `MapView.vue` — retired

Callers migrate from `<MapView>` to `<OsmPoiMap>`:
- Remove `isPlaceholderAnimated` prop (placeholder is caller's responsibility)
- Update `@bounds-changed` → `@bounds:changed`
- No logic changes required

---

## Call Sites to Update

| File | Change |
|------|--------|
| [BrowseProfiles.vue](apps/frontend/src/features/browse/views/BrowseProfiles.vue) | `MapView` → `OsmPoiMap`; `@bounds-changed` → `@bounds:changed`; remove `isPlaceholderAnimated` |
| [BrowsePosts.vue](apps/frontend/src/features/posts/views/BrowsePosts.vue) | `MapView` → `OsmPoiMap`; `@bounds-changed` → `@bounds:changed`; remove `isPlaceholderAnimated` |
| [OsmPoiMap.spec.ts](apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts) | All `bounds-changed` string refs → `bounds:changed`; remove `selectedId` prop usage |

---

## Verification

### Unit tests (`MapController.spec.ts` — new file)
- Phase transitions: `init()` reaches `ready` after tile load
- Deferred work: `flyToCenter` queued before `ready`, executed on drain
- `DiffableLayer`: add/remove/update diffing correctness
- `fitBounds` does not emit `bounds:changed` (unregister/re-register pattern)
- `dissolvedClusterAt` consumed once by `updateMarkers`

### Existing component tests
- Update all `bounds-changed` → `bounds:changed`
- Remove `selectedId` prop from test setups
- All existing assertions remain intact

### Manual smoke test
- Pan/zoom emits `bounds:changed` once (debounced)
- Cluster click at max-zoom auto-spiderfies leaf markers
- KeepAlive hide + show restores map center without data refetch
- Opening a popup does not trigger a bounds-changed data fetch
- `flyToMarker` called from parent navigates smoothly
