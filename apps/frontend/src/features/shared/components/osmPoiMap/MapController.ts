import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { OverlappingMarkerSpiderfier } from 'ts-overlapping-marker-spiderfier-leaflet'
import { nextTick } from 'vue'

import type { MapPoi, MapCluster, BoundsWithZoom, MarkerConfig } from './OsmPoiMap.types'
import { isValidLatLng, createServerClusterIcon, hydratePoiIcon, MAP_MAX_ZOOM } from './mapUtils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * True when the device's primary input is a fine pointer that supports real
 * hover (i.e. a mouse). Touch devices report `(hover: none)` and only ever
 * fire `mouseover` as a synthesized side-effect of a tap, which is the case
 * we want to keep autoPan on for. Evaluated once at module load — the
 * primary input device does not change at runtime.
 */
const HAS_REAL_HOVER =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches

type MapPhase = 'uninitialized' | 'loading' | 'ready' | 'suspended'

interface DeferredWork {
  center?: [number, number]
}

export interface MapConfig {
  center?: [number, number]
  zoom: number
  tileUrl: string | undefined
  attribution: string | undefined
  boundsDebounce: number
  fitToPois: boolean
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
    this.doUpdateMarkers(items)
  }

  updateClusters(clusters: MapCluster[]): void {
    if (this.phase !== 'ready') return
    this.clusters.update(clusters)
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
    this.map.flyTo([poi.location.lat, poi.location.lon], MAP_MAX_ZOOM, {
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

    // OMS click: always emit item:select, never open popup
    this.oms.addListener('click', (marker) => {
      for (const item of this.pois.allItems()) {
        if (this.pois.get(item.id) === (marker as LMarker)) {
          this.callbacks.onItemSelect(item.id)
          return
        }
      }
    })

    this.pois = new DiffableLayer<MapPoi>(this.pointLayer, {
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
    })

    this.clusters = new DiffableLayer<MapCluster>(this.clusterLayer, {
      create: (cluster) => this.createClusterMarker(cluster),
      shouldUpdate: (prev, next) =>
        prev.count !== next.count ||
        prev.location.lat !== next.location.lat ||
        prev.location.lon !== next.location.lon,
      apply: (marker, cluster) => {
        marker.setLatLng([cluster.location.lat, cluster.location.lon])
        marker.setIcon(createServerClusterIcon(cluster.count))
      },
    })
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
    const { resolveIcon, resolvePopup, fetchPopupData } = this.markerConfig

    const m = L.marker([item.location.lat, item.location.lon], {
      icon: hydratePoiIcon(
        resolveIcon(item),
        { image: item.image, isSelected: false, isHighlighted: item.highlighted ?? false },
        this.iconCache
      ),
      keyboard: true,
    })

    if (resolvePopup) {
      m.bindPopup('', {
        maxWidth: 420,
        autoPan: true,
        autoPanPadding: L.point(20, 20),
        className: item.highlighted ? 'item-popup item-popup-highlighted' : 'item-popup',
      })

      // Popup on hover only — OMS click handles selection.
      // On real mouse devices we suppress autoPan so the map doesn't lurch
      // under the cursor; on touch devices the same `mouseover` is synthesized
      // from a tap, and there autoPan is desired so the selected popup is
      // panned fully into view. Discriminator is the device capability
      // (`HAS_REAL_HOVER`), not the event — Leaflet's `mouseover` originalEvent
      // is a plain MouseEvent with no pointerType.
      m.on('mouseover', () => {
        const popup = m.getPopup()
        if (popup) popup.options.autoPan = !HAS_REAL_HOVER
        m.openPopup()
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
            if (fullData && target) {
              this.callbacks.onPopupOpen({ ...item, source: fullData }, target)
            }
          } catch {
            // Popup may already be closed — nothing useful to show.
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

    // Note: OMS registration happens in doUpdateMarkers after DiffableLayer.update()
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
        // At max zoom the cluster dissolves into individual leaf markers.
        // Remove immediately so it can't intercept the next click.
        // Store position so doUpdateMarkers can auto-spiderfy after leaves arrive.
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

  private doUpdateMarkers(items: MapPoi[]): void {
    if (!this.markerConfig) return
    const { added, removed } = this.pois.update(items)

    // Sync OMS registrations with DiffableLayer changes
    for (const m of removed) this.oms.removeMarker(m)
    for (const m of added) this.oms.addMarker(m)

    // fitBounds on initial load: all new markers, none removed, no explicit center
    if (
      added.length > 0 &&
      this.pois.size() === added.length &&
      !this.config.center &&
      items.length > 0
    ) {
      const latlngs = items.map((i) => [i.location.lat, i.location.lon] as [number, number])
      const bounds = L.latLngBounds(latlngs)
      // Unregister/re-register moveend to suppress bounds:changed from programmatic fitBounds
      this.map.off('moveend', this.emitBounds)
      this.map.fitBounds(bounds, { padding: [24, 24] })
      this.map.once('moveend', () => this.map.on('moveend', this.emitBounds))
    }

    // After dissolving a max-zoom cluster, auto-spiderfy the co-located leaf markers
    if (this.dissolvedClusterAt) {
      const target = this.dissolvedClusterAt
      this.dissolvedClusterAt = null
      setTimeout(() => this.triggerSpiderfy(target), 0)
    }
  }

  private triggerSpiderfy(target: L.LatLng): void {
    const match = [...this.pois.values()].find(
      (m) => m.getLatLng().distanceTo(target) < SPIDERFY_COLOCATION_THRESHOLD_M
    )
    if (!match) return
    ;(this.oms as any).spiderListener(match)
  }
}
