# OsmPoiMap Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 525-line `OsmPoiMap.vue` monolith with a plain-TS `MapController` class + thin Vue composable + thin component, eliminating all timing flags via a state machine and collapsing two parallel marker loops into a single `DiffableLayer<T>` abstraction.

**Architecture:** `MapController.ts` owns all Leaflet state and implements a 4-phase state machine (`uninitialized → loading → ready → suspended`) with a deferred-work queue. `useMapController.ts` is a ~40-line Vue composable that bridges lifecycle/prop watchers to the controller. `OsmPoiMap.vue` becomes template + lifecycle delegation only.

**Tech Stack:** Vue 3 Composition API (`<script setup>`), Leaflet, ts-overlapping-marker-spiderfier-leaflet, Vitest + Vue Test Utils.

---

## File Map

| Action | Path |
|--------|------|
| Create | `apps/frontend/src/features/shared/components/osmPoiMap/MapController.ts` |
| Create | `apps/frontend/src/features/shared/components/osmPoiMap/useMapController.ts` |
| Create | `apps/frontend/src/features/shared/components/osmPoiMap/__tests__/MapController.spec.ts` |
| Modify | `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue` |
| Modify | `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.types.ts` |
| Modify | `apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts` |
| Delete | `apps/frontend/src/features/shared/components/MapView.vue` |
| Modify | `apps/frontend/src/features/browse/views/BrowseProfiles.vue` |
| Modify | `apps/frontend/src/features/posts/views/BrowsePosts.vue` |

---

## Task 1: Update `OsmPoiMap.types.ts` — add `MarkerConfig`, rename emit

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.types.ts`

The refactor removes `selectedId` / `highlightedPoiId` from props and adds `boundsDebounce`. `MapController` needs a `MarkerConfig` type to carry the per-render icon-resolution closure. We also rename `bounds-changed` → `bounds:changed` in the emits type.

- [ ] **Step 1: Update `OsmPoiMap.types.ts`**

Replace the entire file content:

```typescript
import type { AvatarImage } from '@/features/publicprofile/components/MapIcon.vue'
import type { Component } from 'vue'

/** Location coordinates for a map point */
export interface PoiLocation {
  lat: number
  lon: number
}

/** Viewport bounds emitted by bounds:changed */
export interface MapBounds {
  south: number
  north: number
  west: number
  east: number
}

/** Props contract for custom marker icon components passed via `iconComponent`. */
export interface PoiIconProps {
  image?: AvatarImage
  isSelected: boolean
  isHighlighted: boolean
}

/** A point-of-interest item for the map. Call sites map domain objects into this shape. */
export interface MapPoi {
  id: string | number
  title: string
  location: PoiLocation
  image?: AvatarImage
  highlighted?: boolean
  /** Discriminator for icon resolution when multiple POI types share one map. */
  type?: string
  /** The original domain object, passed through to the popup component as `:item` */
  source: unknown
}

/** A server-computed cluster marker. */
export interface MapCluster {
  id: number
  location: PoiLocation
  count: number
  expansionZoom: number
}

/** Bounds + zoom emitted on viewport change for cluster queries. */
export interface BoundsWithZoom {
  bounds: MapBounds
  zoom: number
}

/** Per-render configuration passed from the component to MapController.updateMarkers(). */
export interface MarkerConfig {
  resolveIcon: (poi: MapPoi) => Component
  popupComponent?: Component
  fetchPopupData?: (id: string | number) => Promise<unknown>
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.types.ts
git commit -m "refactor(map): add MarkerConfig type, prep for bounds:changed rename"
```

---

## Task 2: Create `MapController.ts` — state machine + `DiffableLayer<T>`

**Files:**
- Create: `apps/frontend/src/features/shared/components/osmPoiMap/MapController.ts`

This is the core of the refactor. It contains the `DiffableLayer<T>` internal class and the `MapController` class. No Vue imports — pure TypeScript and Leaflet.

- [ ] **Step 1: Create `MapController.ts`**

```typescript
import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { OverlappingMarkerSpiderfier } from 'ts-overlapping-marker-spiderfier-leaflet'
import { render, h, nextTick } from 'vue'

import type { MapPoi, MapCluster, BoundsWithZoom, MarkerConfig } from './OsmPoiMap.types'
import { isValidLatLng, createServerClusterIcon, hydratePoiIcon, MAP_MAX_ZOOM } from './mapUtils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MapPhase = 'uninitialized' | 'loading' | 'ready' | 'suspended'

interface DeferredWork {
  center?: [number, number]
  spiderfyAt?: L.LatLng
}

export interface MapConfig {
  center?: [number, number]
  zoom: number
  tileUrl: string | undefined
  attribution: string | undefined
  boundsDebounce: number
}

export interface MapCallbacks {
  onBoundsChanged: (payload: BoundsWithZoom) => void
  onItemSelect: (id: string | number) => void
  onMapReady: (map: LMap) => void
  onPopupOpen: (item: MapPoi, target: HTMLElement) => void
  onPopupClose: () => void
}

// ---------------------------------------------------------------------------
// DiffableLayer<T>
// ---------------------------------------------------------------------------

/**
 * Generic add/remove/update diffing layer.
 * Instantiated once for POI markers, once for cluster markers.
 * The structural diffing logic lives here exactly once.
 */
class DiffableLayer<T extends { id: string | number }> {
  private layer: L.LayerGroup
  private markers = new Map<string | number, LMarker>()
  private items = new Map<string | number, T>()
  private fns: {
    create: (item: T) => LMarker
    shouldUpdate: (prev: T, next: T) => boolean
    apply: (marker: LMarker, item: T) => void
  }

  constructor(
    layer: L.LayerGroup,
    fns: {
      create: (item: T) => LMarker
      shouldUpdate: (prev: T, next: T) => boolean
      apply: (marker: LMarker, item: T) => void
    }
  ) {
    this.layer = layer
    this.fns = fns
  }

  update(incoming: T[]): { added: LMarker[]; removed: LMarker[] } {
    const incomingMap = new Map<string | number, T>()
    for (const item of incoming) incomingMap.set(item.id, item)

    const toRemove: LMarker[] = []
    for (const [id, marker] of this.markers) {
      if (!incomingMap.has(id)) {
        toRemove.push(marker)
        this.markers.delete(id)
        this.items.delete(id)
      }
    }

    const toAdd: LMarker[] = []
    for (const [id, item] of incomingMap) {
      const prev = this.items.get(id)
      if (!prev) {
        const marker = this.fns.create(item)
        this.markers.set(id, marker)
        this.items.set(id, item)
        toAdd.push(marker)
      } else {
        this.items.set(id, item)
        if (this.fns.shouldUpdate(prev, item)) {
          this.fns.apply(this.markers.get(id)!, item)
        }
      }
    }

    for (const m of toRemove) this.layer.removeLayer(m)
    for (const m of toAdd) this.layer.addLayer(m)

    return { added: toAdd, removed: toRemove }
  }

  clear(): void {
    this.layer.clearLayers()
    this.markers.clear()
    this.items.clear()
  }

  get(id: string | number): LMarker | undefined {
    return this.markers.get(id)
  }

  values(): IterableIterator<LMarker> {
    return this.markers.values()
  }

  size(): number {
    return this.markers.size
  }

  allItems(): T[] {
    return [...this.items.values()]
  }
}

// ---------------------------------------------------------------------------
// OMS tuning constants
// ---------------------------------------------------------------------------

const SPIDERFY_COLOCATION_THRESHOLD_M = 10
const OMS_CIRCLE_FOOT_SEPARATION = 65
const OMS_SPIRAL_FOOT_SEPARATION = 50
const OMS_SPIRAL_LENGTH_START = 16
const OMS_SPIRAL_LENGTH_FACTOR = 12

// ---------------------------------------------------------------------------
// MapController
// ---------------------------------------------------------------------------

export class MapController {
  private phase: MapPhase = 'uninitialized'
  private deferred: DeferredWork = {}

  // Leaflet objects (valid after init())
  private map!: LMap
  private oms!: OverlappingMarkerSpiderfier
  private pois!: DiffableLayer<MapPoi>
  private clusters!: DiffableLayer<MapCluster>
  private pointLayer!: L.LayerGroup
  private clusterLayer!: L.LayerGroup
  private iconCache = new Map<string, L.DivIcon>()
  private resizeObserver!: ResizeObserver
  private boundsTimer: ReturnType<typeof setTimeout> | null = null
  private dissolvedClusterAt: L.LatLng | null = null
  private lastStableZoom: number
  private markerConfig: MarkerConfig | null = null

  private el: HTMLDivElement
  private config: MapConfig
  private callbacks: MapCallbacks

  constructor(el: HTMLDivElement, config: MapConfig, callbacks: MapCallbacks) {
    this.el = el
    this.config = config
    this.callbacks = callbacks
    this.lastStableZoom = config.zoom
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  init(): void {
    if (this.phase !== 'uninitialized') return
    this.phase = 'loading'
    this.createMap()
    this.initLayers()
    this.initTileLayer()
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    if (this.boundsTimer) {
      clearTimeout(this.boundsTimer)
      this.boundsTimer = null
    }
    this.iconCache.clear()
    this.map?.off('moveend', this.emitBounds)
    this.pois?.clear()
    this.clusters?.clear()
    this.map?.remove()
    this.phase = 'uninitialized'
  }

  reactivate(): void {
    if (this.phase !== 'suspended') return
    this.map.invalidateSize({ debounceMoveend: true })
    const size = this.map.getSize()
    if (size.x === 0 || size.y === 0) return
    this.phase = 'ready'
    this.drainDeferred()
  }

  suspend(): void {
    if (this.phase !== 'ready') return
    this.phase = 'suspended'
  }

  // ── Data updates ──────────────────────────────────────────────────────────

  updateMarkers(items: MapPoi[], config: MarkerConfig): void {
    this.markerConfig = config
    if (this.phase !== 'ready') return
    const size = this.map.getSize()
    if (size.x === 0 || size.y === 0) return
    this._doUpdateMarkers(items)
  }

  updateClusters(clusters: MapCluster[]): void {
    if (this.phase !== 'ready') return
    this._doUpdateClusters(clusters)
  }

  // ── Imperative commands ───────────────────────────────────────────────────

  flyToCenter(center: [number, number]): void {
    if (!isValidLatLng(center)) return
    if (this.phase !== 'ready') {
      this.deferred.center = center
      return
    }
    const size = this.map.getSize()
    if (size.x === 0 || size.y === 0) {
      this.deferred.center = center
      return
    }
    this.map.flyTo(center, this.lastStableZoom, { duration: 1 })
  }

  flyToMarker(poi: MapPoi): void {
    if (this.phase !== 'ready') return
    this.map.flyTo([poi.location.lat, poi.location.lon], Math.max(this.map.getZoom(), 13), {
      animate: true,
      duration: 0.6,
    })
  }

  // ── Private: map creation ─────────────────────────────────────────────────

  private createMap(): void {
    this.map = L.map(this.el, {
      center: this.config.center ?? [0, 0],
      zoom: this.config.center ? this.config.zoom : 2,
      maxZoom: MAP_MAX_ZOOM,
      preferCanvas: true,
      trackResize: false,
      zoomControl: false,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(this.map)

    this.map.on('zoomend', () => {
      this.lastStableZoom = this.map.getZoom()
    })
    this.map.on('moveend', this.emitBounds)

    this.resizeObserver = new ResizeObserver(() => {
      const size = this.map.getSize()
      if (size.x === 0 || size.y === 0) return
      this.map.invalidateSize({ debounceMoveend: true })
      if (this.deferred.center) {
        const center = this.deferred.center
        this.deferred.center = undefined
        this.map.flyTo(center, this.lastStableZoom, { duration: 1 })
      }
    })
    this.resizeObserver.observe(this.el)
  }

  private initTileLayer(): void {
    const { tileUrl, attribution } = this.config
    if (!tileUrl) {
      console.error('[OsmPoiMap] MAP_TILE_URL is not configured. Map tiles will not load.')
      this.onReady()
      return
    }
    const tile = L.tileLayer(tileUrl, { maxZoom: MAP_MAX_ZOOM, attribution }).addTo(this.map)
    tile.once('load', () => this.onReady())
  }

  private initLayers(): void {
    this.pointLayer = L.layerGroup().addTo(this.map)
    this.clusterLayer = L.layerGroup().addTo(this.map)

    this.oms = new OverlappingMarkerSpiderfier(this.map, { keepSpiderfied: true })
    this.oms.circleFootSeparation = OMS_CIRCLE_FOOT_SEPARATION
    this.oms.spiralFootSeparation = OMS_SPIRAL_FOOT_SEPARATION
    this.oms.spiralLengthStart = OMS_SPIRAL_LENGTH_START
    this.oms.spiralLengthFactor = OMS_SPIRAL_LENGTH_FACTOR
    this.oms.addListener('click', (marker) => {
      const poi = this.pois.allItems().find((p) => this.pois.get(p.id) === marker)
      if (!poi) return
      this.callbacks.onItemSelect(poi.id)
    })

    this.pois = new DiffableLayer<MapPoi>(
      this.pointLayer,
      {
        create: (item) => this.createPoiMarker(item),
        shouldUpdate: (prev, next) => {
          const prevUrl = prev.image?.variants?.[0]?.url
          const nextUrl = next.image?.variants?.[0]?.url
          return prev.highlighted !== next.highlighted || prevUrl !== nextUrl
        },
        apply: (marker, item) => {
          if (!this.markerConfig) return
          marker.setIcon(
            hydratePoiIcon(
              this.markerConfig.resolveIcon(item),
              { image: item.image, isSelected: false, isHighlighted: item.highlighted ?? false },
              this.iconCache
            )
          )
        },
      }
    )

    this.clusters = new DiffableLayer<MapCluster>(
      this.clusterLayer,
      {
        create: (cluster) => this.createClusterMarker(cluster),
        shouldUpdate: (prev, next) =>
          prev.count !== next.count ||
          prev.location.lat !== next.location.lat ||
          prev.location.lon !== next.location.lon,
        apply: (marker, cluster) => {
          marker.setLatLng([cluster.location.lat, cluster.location.lon])
          marker.setIcon(createServerClusterIcon(cluster.count))
        },
      }
    )
  }

  private onReady(): void {
    this.phase = 'ready'
    this.callbacks.onMapReady(this.map)
    this.drainDeferred()
  }

  private drainDeferred(): void {
    if (this.deferred.center) {
      const center = this.deferred.center
      this.deferred.center = undefined
      this.map.flyTo(center, this.lastStableZoom, { duration: 1 })
    }
  }

  // ── Private: bounds emission ───────────────────────────────────────────────

  private emitBounds = (): void => {
    if (this.boundsTimer) clearTimeout(this.boundsTimer)
    this.boundsTimer = setTimeout(() => {
      this.boundsTimer = null
      if (!this.map) return
      const size = this.map.getSize()
      if (size.x === 0 || size.y === 0) return
      const b = this.map.getBounds()
      this.callbacks.onBoundsChanged({
        bounds: {
          south: b.getSouth(),
          north: b.getNorth(),
          west: b.getWest(),
          east: b.getEast(),
        },
        zoom: this.map.getZoom(),
      })
    }, this.config.boundsDebounce)
  }

  // ── Private: POI markers ───────────────────────────────────────────────────

  private createPoiMarker(item: MapPoi): LMarker {
    if (!this.markerConfig) throw new Error('markerConfig must be set before createPoiMarker')
    const { resolveIcon, popupComponent, fetchPopupData } = this.markerConfig
    const m = L.marker([item.location.lat, item.location.lon], {
      title: item.title,
      icon: hydratePoiIcon(
        resolveIcon(item),
        { image: item.image, isSelected: false, isHighlighted: item.highlighted ?? false },
        this.iconCache
      ),
      keyboard: true,
    })

    m.on('mouseover', () => m.openPopup())

    if (popupComponent) {
      m.bindPopup('', {
        maxWidth: 420,
        autoPan: true,
        autoPanPadding: L.point(20, 20),
        className: item.highlighted ? 'item-popup item-popup-highlighted' : 'item-popup',
      })

      m.on('popupopen', async (e: L.PopupEvent) => {
        const popup = e.popup
        const target = popup
          .getElement()
          ?.querySelector('.leaflet-popup-content') as HTMLElement | null
        if (target) {
          this.callbacks.onPopupOpen(item, target)
        }

        if (fetchPopupData) {
          const itemId = item.id
          try {
            const fullData = await fetchPopupData(itemId)
            if (!popup.isOpen()) return
            // Notify with enriched item
            if (fullData && target) {
              this.callbacks.onPopupOpen({ ...item, source: fullData }, target)
            }
          } catch {
            // Popup may already be closed — nothing to show.
          }
        }

        if (popup.isOpen()) {
          nextTick(() => popup.update())
        }
      })

      m.on('popupclose', () => {
        this.callbacks.onPopupClose()
      })
    }

    this.oms.addMarker(m)
    return m
  }

  // ── Private: cluster markers ───────────────────────────────────────────────

  private createClusterMarker(cluster: MapCluster): LMarker {
    const m = L.marker([cluster.location.lat, cluster.location.lon], {
      icon: createServerClusterIcon(cluster.count),
      keyboard: true,
    })

    m.on('click', () => {
      if (cluster.expansionZoom >= MAP_MAX_ZOOM) {
        // Dissolve at max zoom: remove cluster immediately, queue spiderfy for leaf markers
        this.clusters.update(this.clusters.allItems().filter((c) => c.id !== cluster.id))
        this.dissolvedClusterAt = L.latLng(cluster.location.lat, cluster.location.lon)
        this.map.setView([cluster.location.lat, cluster.location.lon], MAP_MAX_ZOOM)
      } else {
        this.map.flyTo([cluster.location.lat, cluster.location.lon], cluster.expansionZoom, {
          duration: 0.5,
        })
      }
    })

    return m
  }

  private _doUpdateMarkers(items: MapPoi[]): void {
    if (!this.markerConfig) return
    const { added } = this.pois.update(items)

    // OMS: remove markers no longer in the layer, add new ones
    // (DiffableLayer handles layer, OMS needs separate tracking)
    for (const m of added) {
      this.oms.addMarker(m)
    }

    // fitBounds on initial load: all new, none removed, no explicit center
    const allItems = this.pois.allItems()
    if (
      added.length > 0 &&
      this.pois.size() === added.length &&
      !this.config.center &&
      items.length > 0
    ) {
      const latlngs = items.map((i) => [i.location.lat, i.location.lon] as [number, number])
      const bounds = L.latLngBounds(latlngs)
      this.map.off('moveend', this.emitBounds)
      this.map.fitBounds(bounds, { padding: [24, 24] })
      this.map.once('moveend', () => this.map.on('moveend', this.emitBounds))
    }

    // After dissolving a max-zoom cluster, auto-spiderfy leaf markers
    if (this.dissolvedClusterAt) {
      const target = this.dissolvedClusterAt
      this.dissolvedClusterAt = null
      setTimeout(() => this.triggerSpiderfy(target), 0)
    }
  }

  private _doUpdateClusters(clusters: MapCluster[]): void {
    this.clusters.update(clusters)
  }

  private triggerSpiderfy(target: L.LatLng): void {
    const match = [...this.pois.values()].find(
      (m) => m.getLatLng().distanceTo(target) < SPIDERFY_COLOCATION_THRESHOLD_M
    )
    if (!match) return
    ;(this.oms as any).spiderListener(match)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/MapController.ts
git commit -m "feat(map): add MapController with state machine and DiffableLayer"
```

---

## Task 3: Write unit tests for `MapController`

**Files:**
- Create: `apps/frontend/src/features/shared/components/osmPoiMap/__tests__/MapController.spec.ts`

These tests cover the state machine, deferred work queue, `DiffableLayer` diffing, `fitBounds` suppression, and `dissolvedClusterAt`. All Leaflet calls are mocked — no DOM required.

- [ ] **Step 1: Create `MapController.spec.ts`**

```typescript
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest'
import { defineComponent, h } from 'vue'

// Stub ResizeObserver
const resizeCallbacks: Array<() => void> = []
const ResizeObserverStub = vi.fn(function (cb: () => void) {
  resizeCallbacks.push(cb)
  return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }
})
vi.stubGlobal('ResizeObserver', ResizeObserverStub)
afterAll(() => vi.unstubAllGlobals())

// Mock leaflet
vi.mock('leaflet', () => {
  const divIcon = vi.fn((opts: any) => ({ _type: 'divIcon', ...opts }))

  const markerProto = {
    bindPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
    setIcon: vi.fn().mockReturnThis(),
    setLatLng: vi.fn().mockReturnThis(),
    getLatLng: vi.fn(() => ({ lat: 47, lng: 19, distanceTo: vi.fn(() => 0) })),
  }
  const marker = vi.fn((_latLng: any, opts: any) => {
    const m = { ...markerProto, on: vi.fn().mockReturnThis(), _icon: opts?.icon }
    return m
  })

  const layerGroupProto = {
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
  }
  const layerGroup = vi.fn(() => ({ ...layerGroupProto }))

  const latLng = vi.fn((lat: number, lng: number) => ({
    lat,
    lng,
    distanceTo: vi.fn(() => 0),
  }))
  const latLngBounds = vi.fn((latlngs: any[]) => ({ latlngs }))
  const point = vi.fn((x: number, y: number) => ({ x, y }))

  const mapProto = {
    setView: vi.fn().mockReturnThis(),
    flyTo: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    getZoom: vi.fn(() => 10),
    getSize: vi.fn(() => ({ x: 1000, y: 800 })),
    invalidateSize: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => ({
      getSouth: () => 45,
      getNorth: () => 48,
      getWest: () => 16,
      getEast: () => 23,
    })),
    on: vi.fn().mockReturnThis(),
    once: vi.fn(function (this: any, _event: string, cb: () => void) {
      cb()
      return this
    }),
    off: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    createPane: vi.fn(() => document.createElement('div')),
    closePopup: vi.fn().mockReturnThis(),
  }
  const mapFn = vi.fn(() => ({ ...mapProto }))

  const tileLayerProto = {
    addTo: vi.fn().mockReturnThis(),
    once: vi.fn(function (this: any, _event: string, cb: () => void) {
      cb()
      return this
    }),
  }
  const tileLayer = vi.fn(() => ({ ...tileLayerProto }))

  const control = {
    zoom: vi.fn(() => ({ addTo: vi.fn() })),
  }

  return {
    default: { map: mapFn, marker, divIcon, layerGroup, latLng, latLngBounds, point, tileLayer, control },
    Map: mapFn,
    Marker: marker,
    map: mapFn,
    marker,
    divIcon,
    layerGroup,
    latLng,
    latLngBounds,
    point,
    tileLayer,
    control,
  }
})

const { omsInstance } = vi.hoisted(() => ({
  omsInstance: {
    addMarker: vi.fn().mockReturnThis(),
    removeMarker: vi.fn().mockReturnThis(),
    clearMarkers: vi.fn().mockReturnThis(),
    addListener: vi.fn().mockReturnThis(),
    getMarkers: vi.fn(() => []),
    circleFootSeparation: 25,
    spiralFootSeparation: 28,
    spiralLengthStart: 11,
    spiralLengthFactor: 5,
    spiderListener: vi.fn(),
  },
}))
vi.mock('ts-overlapping-marker-spiderfier-leaflet', () => ({
  OverlappingMarkerSpiderfier: vi.fn(() => omsInstance),
}))

vi.mock('@/features/images/composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:image/png;blurhash=${hash}`,
}))

import L from 'leaflet'
import { MapController } from '../MapController'
import type { MapConfig, MapCallbacks } from '../MapController'
import type { MapPoi, MapCluster, MarkerConfig } from '../OsmPoiMap.types'
import { MAP_MAX_ZOOM } from '../mapUtils'

const DummyIcon = defineComponent({ render: () => h('span') })

function makeEl(): HTMLDivElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function makeConfig(overrides: Partial<MapConfig> = {}): MapConfig {
  return {
    center: undefined,
    zoom: 7,
    tileUrl: undefined,
    attribution: undefined,
    boundsDebounce: 300,
    ...overrides,
  }
}

function makeCallbacks(): MapCallbacks & { calls: Record<string, any[][]> } {
  const calls: Record<string, any[][]> = {
    onBoundsChanged: [],
    onItemSelect: [],
    onMapReady: [],
    onPopupOpen: [],
    onPopupClose: [],
  }
  return {
    calls,
    onBoundsChanged: (...args) => calls.onBoundsChanged.push(args),
    onItemSelect: (...args) => calls.onItemSelect.push(args),
    onMapReady: (...args) => calls.onMapReady.push(args),
    onPopupOpen: (...args) => calls.onPopupOpen.push(args),
    onPopupClose: (...args) => calls.onPopupClose.push(args),
  }
}

function makeMarkerConfig(): MarkerConfig {
  return { resolveIcon: () => DummyIcon }
}

function makePoi(id: string, overrides: Partial<MapPoi> = {}): MapPoi {
  return {
    id,
    title: id,
    location: { lat: 47, lon: 19 },
    source: {},
    ...overrides,
  }
}

function makeCluster(id: number, expansionZoom = 8): MapCluster {
  return { id, location: { lat: 47, lon: 19 }, count: 3, expansionZoom }
}

beforeEach(() => {
  resizeCallbacks.length = 0
  vi.clearAllMocks()
  omsInstance.addMarker.mockReturnThis()
  omsInstance.addListener.mockReturnThis()
  omsInstance.spiderListener.mockReset()
})

describe('MapController — phase transitions', () => {
  it('reaches ready phase after tile load (tileUrl empty → immediate)', () => {
    const el = makeEl()
    const callbacks = makeCallbacks()
    const ctrl = new MapController(el, makeConfig(), callbacks)

    ctrl.init()

    // onMapReady should have been called once (tileUrl empty → immediate ready)
    expect(callbacks.calls.onMapReady).toHaveLength(1)
  })

  it('does not re-init when init() called twice', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks())
    ctrl.init()
    ctrl.init() // second call should be a no-op

    expect(L.map).toHaveBeenCalledTimes(1)
  })

  it('transitions to suspended on suspend() and back to ready on reactivate()', () => {
    const el = makeEl()
    const callbacks = makeCallbacks()
    const ctrl = new MapController(el, makeConfig(), callbacks)
    ctrl.init()

    ctrl.suspend()
    // map:ready was already called at init; suspend then reactivate
    const readyCountBefore = callbacks.calls.onMapReady.length

    const mapInstance = (L.map as any).mock.results[0].value
    // reactivate calls invalidateSize + drainDeferred; getSize returns non-zero
    ctrl.reactivate()

    // invalidateSize called
    expect(mapInstance.invalidateSize).toHaveBeenCalled()
    // reactivate does not re-emit onMapReady
    expect(callbacks.calls.onMapReady).toHaveLength(readyCountBefore)
  })
})

describe('MapController — deferred work', () => {
  it('queues flyToCenter when phase is loading and drains on ready', () => {
    // Make tile load NOT fire immediately so we can test the deferred path
    const tileProto = { addTo: vi.fn().mockReturnThis(), once: vi.fn() }
    ;(L.tileLayer as any).mockImplementationOnce(() => tileProto)

    const el = makeEl()
    const ctrl = new MapController(
      el,
      makeConfig({ tileUrl: 'https://tiles.example.com/{z}/{x}/{y}.png', center: [47, 19] }),
      makeCallbacks()
    )
    ctrl.init()

    // Still loading — flyToCenter should be deferred
    const mapInstance = (L.map as any).mock.results[(L.map as any).mock.results.length - 1].value
    mapInstance.flyTo.mockClear()

    ctrl.flyToCenter([50, 14])
    expect(mapInstance.flyTo).not.toHaveBeenCalled()

    // Drain: simulate tile load firing
    const onceCall = tileProto.once.mock.calls.find((c: any) => c[0] === 'load')
    expect(onceCall).toBeDefined()
    onceCall![1]() // triggers onReady → drainDeferred

    expect(mapInstance.flyTo).toHaveBeenCalledWith([50, 14], expect.any(Number), { duration: 1 })
  })
})

describe('MapController — DiffableLayer via updateMarkers', () => {
  it('adds markers for initial items', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks())
    ctrl.init()

    ctrl.updateMarkers([makePoi('1'), makePoi('2')], makeMarkerConfig())

    expect(L.marker).toHaveBeenCalledTimes(2)
  })

  it('does not recreate unchanged markers on second update', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks())
    ctrl.init()

    const poi = makePoi('1')
    ctrl.updateMarkers([poi], makeMarkerConfig())
    const countAfterFirst = (L.marker as any).mock.calls.length

    ctrl.updateMarkers([poi], makeMarkerConfig())
    expect((L.marker as any).mock.calls.length).toBe(countAfterFirst)
  })

  it('calls setIcon in-place when highlighted changes', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks())
    ctrl.init()

    ctrl.updateMarkers([makePoi('1', { highlighted: false })], makeMarkerConfig())
    const markerInst = (L.marker as any).mock.results[0].value

    ctrl.updateMarkers([makePoi('1', { highlighted: true })], makeMarkerConfig())
    expect(markerInst.setIcon).toHaveBeenCalled()
    expect((L.marker as any).mock.calls.length).toBe(1) // no new marker
  })

  it('removes stale markers', () => {
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks())
    ctrl.init()

    ctrl.updateMarkers([makePoi('1'), makePoi('2')], makeMarkerConfig())
    const pointLayerInst = (L.layerGroup as any).mock.results[0].value

    ctrl.updateMarkers([makePoi('1')], makeMarkerConfig())
    expect(pointLayerInst.removeLayer).toHaveBeenCalled()
  })
})

describe('MapController — fitBounds does not emit bounds:changed', () => {
  it('unregisters moveend before fitBounds and re-registers after', () => {
    vi.useFakeTimers()
    const el = makeEl()
    const callbacks = makeCallbacks()
    const ctrl = new MapController(el, makeConfig(), callbacks)
    ctrl.init()

    const mapInstance = (L.map as any).mock.results[0].value

    // Trigger initial load with items — no center → fitBounds path
    ctrl.updateMarkers([makePoi('1'), makePoi('2')], makeMarkerConfig())

    // map.off should have been called to suppress bounds emit
    expect(mapInstance.off).toHaveBeenCalledWith('moveend', expect.any(Function))

    vi.useRealTimers()
  })
})

describe('MapController — dissolvedClusterAt consumed once', () => {
  it('sets dissolvedClusterAt on max-zoom cluster click, consumed by updateMarkers', () => {
    vi.useFakeTimers()
    const el = makeEl()
    const ctrl = new MapController(el, makeConfig(), makeCallbacks())
    ctrl.init()

    const cluster = makeCluster(1, MAP_MAX_ZOOM)
    ctrl.updateClusters([cluster])

    const clusterMarkerInst = (L.marker as any).mock.results[0].value
    const clickHandler = clusterMarkerInst.on.mock.calls.find((c: any) => c[0] === 'click')?.[1]
    expect(clickHandler).toBeDefined()

    clickHandler()

    // spiderfy hasn't fired yet (needs updateMarkers to drain dissolvedClusterAt)
    expect(omsInstance.spiderListener).not.toHaveBeenCalled()

    // updateMarkers drains dissolvedClusterAt
    ctrl.updateMarkers([makePoi('1')], makeMarkerConfig())
    vi.runAllTimers()

    expect(omsInstance.spiderListener).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run the tests**

```bash
pnpm --filter frontend exec vitest run apps/frontend/src/features/shared/components/osmPoiMap/__tests__/MapController.spec.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/__tests__/MapController.spec.ts
git commit -m "test(map): add MapController unit tests"
```

---

## Task 4: Create `useMapController.ts` — Vue composable bridge

**Files:**
- Create: `apps/frontend/src/features/shared/components/osmPoiMap/useMapController.ts`

This composable has no Leaflet imports. It translates Vue lifecycle hooks and prop watchers into `MapController` method calls.

- [ ] **Step 1: Create `useMapController.ts`**

```typescript
import { onMounted, onBeforeUnmount, onActivated, onDeactivated, watch, type Ref } from 'vue'
import type { Component } from 'vue'
import type { Map as LMap } from 'leaflet'

import { MapController } from './MapController'
import type { MapPoi, MapCluster, BoundsWithZoom } from './OsmPoiMap.types'

export interface MapProps {
  items: MapPoi[]
  clusters: MapCluster[]
  iconComponent: Component
  iconResolver?: (poi: MapPoi) => Component
  popupComponent?: Component
  center?: [number, number]
  zoom: number
  fitToPois: boolean
  boundsDebounce: number
  fetchPopupData?: (id: string | number) => Promise<unknown>
}

export interface MapEmitFn {
  (e: 'bounds:changed', payload: BoundsWithZoom): void
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'popup:open', item: MapPoi, target: HTMLElement): void
  (e: 'popup:close'): void
}

export function useMapController(
  mapEl: Ref<HTMLDivElement | null>,
  props: MapProps,
  emit: MapEmitFn
): { flyToMarker: (poi: MapPoi) => void } {
  let controller: MapController | null = null

  function resolveIcon(poi: MapPoi): Component {
    return props.iconResolver ? props.iconResolver(poi) : props.iconComponent
  }

  function markerConfig() {
    return {
      resolveIcon,
      popupComponent: props.popupComponent,
      fetchPopupData: props.fetchPopupData,
    }
  }

  onMounted(() => {
    if (!mapEl.value) return
    controller = new MapController(
      mapEl.value,
      {
        center: props.center,
        zoom: props.zoom,
        tileUrl: __APP_CONFIG__.MAP_TILE_URL,
        attribution: __APP_CONFIG__.MAP_ATTRIBUTION,
        boundsDebounce: props.boundsDebounce,
      },
      {
        onBoundsChanged: (payload) => emit('bounds:changed', payload),
        onItemSelect: (id) => emit('item:select', id),
        onMapReady: (map) => emit('map:ready', map),
        onPopupOpen: (item, target) => emit('popup:open', item, target),
        onPopupClose: () => emit('popup:close'),
      }
    )
    controller.init()
  })

  onBeforeUnmount(() => {
    controller?.destroy()
    controller = null
  })

  onActivated(() => controller?.reactivate())
  onDeactivated(() => controller?.suspend())

  watch(
    () => props.items,
    (items) => controller?.updateMarkers(items, markerConfig())
  )

  watch(
    () => props.clusters,
    (clusters) => controller?.updateClusters(clusters)
  )

  watch(
    () => props.center,
    (center) => {
      if (center) controller?.flyToCenter(center)
    }
  )

  return {
    flyToMarker: (poi: MapPoi) => controller?.flyToMarker(poi),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/useMapController.ts
git commit -m "feat(map): add useMapController composable bridge"
```

---

## Task 5: Rewrite `OsmPoiMap.vue` — thin component + merge MapView

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue`

The component becomes a thin wrapper: template + ref declarations + `useMapController`. The popup teleport is now driven by `popup:open` / `popup:close` emits looped back from the controller via callbacks. The backdrop pane and `closeActivePopup` are removed entirely (hover-only popups eliminate the need). The 500ms `boundsDebounce` prop defaults replaces the two-level debounce. The `MapPlaceholder` from `MapView` moves here.

- [ ] **Step 1: Replace `OsmPoiMap.vue` entirely**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { Component } from 'vue'
import type { Map as LMap } from 'leaflet'

import type { MapPoi, MapCluster, BoundsWithZoom } from './OsmPoiMap.types'
import { useMapController } from './useMapController'
import MapPlaceholder from '@/features/shared/components/MapPlaceholder.vue'

const props = withDefaults(
  defineProps<{
    items: MapPoi[]
    clusters?: MapCluster[]
    iconComponent: Component
    /** Per-item icon resolver. When provided, overrides iconComponent per item. */
    iconResolver?: (poi: MapPoi) => Component
    popupComponent?: Component
    center?: [number, number]
    zoom?: number
    fitToPois?: boolean
    boundsDebounce?: number
    fetchPopupData?: (id: string | number) => Promise<unknown>
  }>(),
  {
    zoom: 7,
    fitToPois: false,
    boundsDebounce: 500,
    clusters: () => [],
  }
)

const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds:changed', payload: BoundsWithZoom): void
}>()

const mapEl = ref<HTMLDivElement | null>(null)
const popupTarget = ref<HTMLElement | null>(null)
const popupItem = ref<MapPoi | null>(null)
const isMapReady = ref(false)

const { flyToMarker } = useMapController(
  mapEl,
  {
    get items() { return props.items },
    get clusters() { return props.clusters ?? [] },
    get iconComponent() { return props.iconComponent },
    get iconResolver() { return props.iconResolver },
    get popupComponent() { return props.popupComponent },
    get center() { return props.center },
    get zoom() { return props.zoom ?? 7 },
    get fitToPois() { return props.fitToPois ?? false },
    get boundsDebounce() { return props.boundsDebounce ?? 500 },
    get fetchPopupData() { return props.fetchPopupData },
  },
  (event, ...args) => {
    if (event === 'bounds:changed') emit('bounds:changed', args[0] as BoundsWithZoom)
    else if (event === 'item:select') emit('item:select', args[0] as string | number)
    else if (event === 'map:ready') {
      isMapReady.value = true
      emit('map:ready', args[0] as LMap)
    } else if (event === 'popup:open') {
      popupItem.value = args[0] as MapPoi
      popupTarget.value = args[1] as HTMLElement
    } else if (event === 'popup:close') {
      popupTarget.value = null
      popupItem.value = null
    }
  }
)

defineExpose({ flyToMarker })
</script>

<template>
  <div class="osm-poi-map-wrapper">
    <MapPlaceholder
      v-show="!isMapReady"
      class="position-absolute top-0 start-0 w-100 h-100 opacity-25"
    />
    <div
      ref="mapEl"
      class="osm-poi-map"
      :class="{ 'opacity-50': !isMapReady }"
    />

    <Teleport
      v-if="popupComponent && popupTarget && popupItem"
      :to="popupTarget"
    >
      <component
        :is="popupComponent"
        :item="popupItem.source"
        @click="$emit('item:select', popupItem.id)"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.osm-poi-map-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
}

.osm-poi-map {
  height: 100%;
  width: 100%;
}

/* Cluster badge */
:deep(.poi-cluster-icon) {
  background: transparent;
  border: none;
}

:deep(.poi-cluster-badge) {
  border-radius: 50%;
  background: #3a86ff;
  color: white;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* Remove default Leaflet icon images spacing */
:deep(.leaflet-div-icon) {
  background: transparent;
  border: none;
}

:deep(.poi-cluster-icon) {
  z-index: 5000;
}

:deep(.poi-avatar-icon img) {
  transition:
    transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 0.15s ease;
}

:deep(.poi-avatar-icon) {
  transition: z-index 0s 250ms;
}

:deep(.poi-avatar-icon:hover) {
  z-index: 10000 !important;
  transition: z-index 0s 0s;
}

:deep(.poi-avatar-icon:hover img) {
  transform: scale(1.3);
  border-color: #3a86ff;
}

:deep(.item-popup-highlighted .leaflet-popup-content-wrapper) {
  box-shadow: 0 3px 13px rgba(217, 83, 79, 0.9);
}

:deep(.item-popup-highlighted .leaflet-popup-tip) {
  box-shadow: 0 3px 14px rgba(217, 83, 79, 0.3);
}

:deep(.leaflet-popup) {
  width: 15rem !important;
}

:deep(.leaflet-popup-content-wrapper) {
  padding: 0;
  border-radius: 0.375rem;
  overflow: visible;
  background: transparent;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.5);
  border: 1px solid transparent;
  transition:
    box-shadow 1.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 0.15s ease;
}

:deep(.leaflet-popup-content-wrapper:hover) {
  box-shadow: 0 3px 18px rgba(0, 0, 0, 0.7);
  border: 1px solid white;
}

:deep(.leaflet-popup-close-button) {
  width: 24px !important;
  height: 24px !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7) !important;
  color: white !important;
  border-radius: 50%;
  font-size: 16px;
  line-height: 1;
  top: -10px !important;
  right: -10px !important;
  padding: 0 !important;
  z-index: 1;
}

:deep(.leaflet-popup-close-button:hover) {
  background: rgba(0, 0, 0, 0.9) !important;
  color: white !important;
}

:deep(.leaflet-popup-content) {
  margin: 0;
  line-height: 1.3;
  min-height: 1px;
  border-radius: 0.375rem;
  overflow: hidden;
}

:deep(.leaflet-popup .card.cursor-pointer:hover),
:deep(.leaflet-popup .card[role='button']:hover) {
  box-shadow: none;
  transform: none;
}

:deep(.leaflet-control-attribution) {
  opacity: 0.4;
  pointer-events: none;
}

@media (max-width: 767.98px) {
  :deep(.leaflet-control-attribution) {
    display: none;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue
git commit -m "refactor(map): rewrite OsmPoiMap.vue as thin component, merge MapView debounce"
```

---

## Task 6: Update `OsmPoiMap.spec.ts` — rename events, remove `selectedId`

**Files:**
- Modify: `apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts`

All existing test assertions remain; only the event name references and `selectedId` prop usages change. The emit name `'bounds-changed'` → `'bounds:changed'`. Tests that accessed `suppressBoundsEmit` via `map.once` mock now rely on the `map.off` / `map.once` pattern in `MapController`.

- [ ] **Step 1: Replace `bounds-changed` → `bounds:changed` and remove `selectedId`**

In the spec file make these targeted changes:

1. Line 358: `expect(wrapper.emitted('bounds-changed')).toBeTruthy()` → `expect(wrapper.emitted('bounds:changed')).toBeTruthy()`
2. Line 359: `wrapper.emitted('bounds-changed')![0]` → `wrapper.emitted('bounds:changed')![0]`
3. Line 472: `expect(wrapper.emitted('bounds-changed')).toBeFalsy()` → `expect(wrapper.emitted('bounds:changed')).toBeFalsy()`
4. Line 476: `expect(wrapper.emitted('bounds-changed')).toBeTruthy()` → `expect(wrapper.emitted('bounds:changed')).toBeTruthy()`
5. Line 516: `expect(wrapper.emitted('bounds-changed')).toBeFalsy()` → `expect(wrapper.emitted('bounds:changed')).toBeFalsy()`
6. Line 523: `expect(wrapper.emitted('bounds-changed')).toBeTruthy()` → `expect(wrapper.emitted('bounds:changed')).toBeTruthy()`
7. Line 553: `expect(wrapper.emitted('bounds-changed')).toHaveLength(1)` → `expect(wrapper.emitted('bounds:changed')).toHaveLength(1)`
8. Line 554: `wrapper.emitted('bounds-changed')![0]` → `wrapper.emitted('bounds:changed')![0]`
9. Remove any usage of `selectedId` prop in `mountMap()` calls and test setups.
10. Update the debounce time in the "debounces bounds-changed emission" test from `300` ms to `500` ms (since `boundsDebounce` prop default is now 500ms in `OsmPoiMap`).

- [ ] **Step 2: Run the existing component test suite**

```bash
pnpm --filter frontend exec vitest run apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts
git commit -m "test(map): update OsmPoiMap.spec to bounds:changed, remove selectedId"
```

---

## Task 7: Delete `MapView.vue` and update call sites

**Files:**
- Delete: `apps/frontend/src/features/shared/components/MapView.vue`
- Modify: `apps/frontend/src/features/browse/views/BrowseProfiles.vue`
- Modify: `apps/frontend/src/features/posts/views/BrowsePosts.vue`

`MapView.vue` is retired. Both callers switch to `<OsmPoiMap>` directly and update `@bounds-changed` → `@bounds:changed`. The `isPlaceholderAnimated` prop and the placeholder overlay are now handled internally by `OsmPoiMap` (always rendered, not configurable externally — callers who need to hide it should not pass `popupComponent`).

- [ ] **Step 1: Update `BrowseProfiles.vue`**

Change:
```typescript
import MapView from '@/features/shared/components/MapView.vue'
// ...
const mapRef = ref<InstanceType<typeof MapView> | null>(null)
```
To:
```typescript
import OsmPoiMap from '@/features/shared/components/osmPoiMap/OsmPoiMap.vue'
// ...
const mapRef = ref<InstanceType<typeof OsmPoiMap> | null>(null)
```

In template, change:
```html
<MapView
  ref="mapRef"
  ...
  :is-placeholder-animated="true"
  ...
  @bounds-changed="onBoundsChanged"
/>
```
To:
```html
<OsmPoiMap
  ref="mapRef"
  ...
  @bounds:changed="onBoundsChanged"
/>
```
(Remove `:is-placeholder-animated`, `:selected-id`, `:highlighted-poi-id` if present.)

- [ ] **Step 2: Update `BrowsePosts.vue`**

Change:
```typescript
import MapView from '@/features/shared/components/MapView.vue'
```
To:
```typescript
import OsmPoiMap from '@/features/shared/components/osmPoiMap/OsmPoiMap.vue'
```

In template, change:
```html
<MapView
  ...
  @bounds-changed="onBoundsChanged"
/>
```
To:
```html
<OsmPoiMap
  ...
  @bounds:changed="onBoundsChanged"
/>
```
(Remove `:is-loading`, `:is-placeholder-animated` if present — these were not actual `MapView` props.)

- [ ] **Step 3: Delete `MapView.vue`**

```bash
git rm apps/frontend/src/features/shared/components/MapView.vue
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/browse/views/BrowseProfiles.vue
git add apps/frontend/src/features/posts/views/BrowsePosts.vue
git commit -m "refactor(map): retire MapView.vue, migrate callers to OsmPoiMap"
```

---

## Task 8: Run full test suite and type-check

- [ ] **Step 1: Run all frontend tests**

```bash
pnpm --filter frontend test
```

Expected: all tests pass.

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Format changed files**

```bash
pnpm exec prettier --write \
  apps/frontend/src/features/shared/components/osmPoiMap/MapController.ts \
  apps/frontend/src/features/shared/components/osmPoiMap/useMapController.ts \
  apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.vue \
  apps/frontend/src/features/shared/components/osmPoiMap/OsmPoiMap.types.ts \
  apps/frontend/src/features/shared/components/osmPoiMap/__tests__/MapController.spec.ts \
  apps/frontend/src/features/shared/components/osmPoiMap/__tests__/OsmPoiMap.spec.ts \
  apps/frontend/src/features/browse/views/BrowseProfiles.vue \
  apps/frontend/src/features/posts/views/BrowsePosts.vue
```

- [ ] **Step 5: Final commit**

```bash
git add -p  # stage formatted files selectively
git commit -m "chore(map): format refactored osmPoiMap files"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| State machine (`uninitialized → loading → ready → suspended`) | Task 2 (`MapController`) |
| `DiffableLayer<T>` collapses two marker loops | Task 2 |
| Vue composable bridge `useMapController` (~40 lines) | Task 4 |
| Thin `OsmPoiMap.vue` component | Task 5 |
| Retire `MapView.vue` | Task 7 |
| Remove `selectedId`, `highlightedPoiId` | Tasks 1, 5 |
| Add `boundsDebounce` prop (default 500ms) | Tasks 1, 5 |
| Rename `bounds-changed` → `bounds:changed` | Tasks 1, 5, 6, 7 |
| `highlightSelected()` deleted | Task 5 (not present in new component) |
| Hover-only popup (`mouseover` → `openPopup`) | Task 2 (`createPoiMarker`) |
| OMS `click` emits `item:select` only | Task 2 (`initLayers` oms listener) |
| Backdrop pane removed | Task 5 |
| `suppressBoundsEmit` → off/once pattern | Task 2 (`_doUpdateMarkers`) |
| `pendingCenter` → `deferred.center` | Task 2 |
| `isMapReady` → `phase === 'ready'` | Task 2 |
| `pendingSpiderfyLatLng` → `dissolvedClusterAt` | Task 2 |
| Unit tests for phase transitions, deferred work, diffing, fitBounds, dissolvedClusterAt | Task 3 |
| Existing component tests updated | Task 6 |
| Call sites migrated (`BrowseProfiles`, `BrowsePosts`) | Task 7 |

### Notes on `useMapController` emit bridge

The composable's `emit` parameter accepts a discriminated union call signature. The inline dispatch in `OsmPoiMap.vue` uses a `(event, ...args)` spread — this is not how Vue's typed `defineEmits` works. **Task 5 must use a proper adapter**. The correct pattern in `OsmPoiMap.vue` is to pass a plain object of callbacks rather than a typed emit function:

```typescript
const { flyToMarker } = useMapController(mapEl, propsProxy, {
  'bounds:changed': (payload) => emit('bounds:changed', payload),
  'item:select': (id) => emit('item:select', id),
  'map:ready': (map) => { isMapReady.value = true; emit('map:ready', map) },
  'popup:open': (item, target) => { popupItem.value = item; popupTarget.value = target },
  'popup:close': () => { popupTarget.value = null; popupItem.value = null },
})
```

Update `useMapController.ts` to accept `callbacks: MapCallbackHandlers` (a plain object) instead of `emit: MapEmitFn`, and update the composable's call in `OsmPoiMap.vue` accordingly. The `MapCallbackHandlers` interface mirrors `MapCallbacks` from `MapController` but with typed event names.
