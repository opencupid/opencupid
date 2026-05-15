import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import {
  nextTick,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  ref,
  shallowRef,
  watch,
} from 'vue'
import type { Component, Ref } from 'vue'

import type { MapPoi, BoundsWithZoom, MarkerConfig, IconRenderer } from '../types/map.types'
import { isValidLatLng, hydratePoiIcon, MAP_MAX_ZOOM } from '../utils/mapUtils'
import { spreadMarkers, type SpreadMarker, type SpreadingConfig } from '../utils/markerSpreading'
import { MAP_DEFAULT_ZOOM } from '@shared/maps'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MapPhase = 'uninitialized' | 'loading' | 'ready' | 'suspended'

interface DeferredWork {
  highlight?: [number, number]
}

export interface MapProps {
  items: MapPoi[]
  iconResolver: (poi: MapPoi) => IconRenderer
  popupResolver?: (poi: MapPoi) => Component
  initialCenter: [number, number]
  highlightedLocation?: [number, number] | null
  fetchPopupData?: (id: string, signal?: AbortSignal) => Promise<unknown>
}

type MapEmit = {
  (e: 'bounds:changed', payload: BoundsWithZoom): void
  (e: 'item:select', id: string): void
  (e: 'map:ready', map: LMap): void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * True when the device reports a real hover-capable pointer (desktop mouse,
 * stylus). On touch-only devices the browser's touch→mouse compatibility
 * layer synthesizes mouseover/mouseout from taps and long-presses, which
 * would misfire the hover-to-open-popup behavior. Gate hover handlers on
 * this so touch devices rely on tap only.
 */
function supportsHover(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover)').matches
  )
}

// ---------------------------------------------------------------------------
// Spread tuning
// ---------------------------------------------------------------------------

const BOUNDS_DEBOUNCE_MS = 500
const SEARCH_FOCUS_ZOOM = 12

/**
 * Tuned for place-level (city-granularity) data. At the default zoom (8)
 * a city-sized cluster of POIs sits within a few pixels of each other;
 * the spreader pushes them apart on a circle / spiral so each is
 * separately hoverable. At `MAP_MAX_ZOOM` (the deepest a viewer can
 * zoom into) markers are shown at their true coordinates.
 *
 * Invariants this config maintains:
 *  - `maxSpreadRadius >= pixelThreshold * 2` so the lowest-zoom spread
 *    actually separates colocated marker icons (40 px each) without leaving
 *    them re-overlapping.
 *  - `minZoomToSpread + maxZoomCutoffOffset <= MAP_MAX_ZOOM` so the
 *    cutoff is reachable and spreading actually disables at street level.
 *    With MAP_MAX_ZOOM=12, an offset of 4 disables spreading at zoom 12.
 */
const SPREAD_CONFIG: SpreadingConfig = {
  pixelThreshold: 24,
  minZoomToSpread: 8,
  maxZoomCutoffOffset: 4,
  maxSpreadRadius: 48,
  spiralRadiusMultiplier: 1.6,
  circleSpiralSwitchover: 8,
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useMapController(
  mapEl: Ref<HTMLDivElement | null>,
  props: MapProps,
  emit: MapEmit
) {
  // Reactive state exposed to the component.
  // popupItem is the marker's PointFeature — always the same shape, used
  // by the host to choose a popup component (post vs profile) and to read
  // ids/coords. popupFullData is the optionally-fetched detail blob (e.g.
  // PublicProfile) returned by fetchPopupData; null for posts (which need
  // no fetch) and null pre-fetch for profiles. The host gates popup
  // rendering on whichever it needs.
  const popupItem = ref<MapPoi | null>(null)
  const popupFullData = ref<unknown>(null)
  const popupTarget = ref<HTMLElement | null>(null)

  // Internal mutable state
  let phase: MapPhase = 'uninitialized'
  const deferred: DeferredWork = {}
  let map: LMap
  let pointLayer: L.LayerGroup
  // Source of truth for the current set of POIs. Spreading reprojects
  // their `current` coordinates on every zoom/move/items change; the
  // Leaflet markers track `current` via setLatLng so existing markers
  // animate to their new positions rather than being torn down.
  const spreadItemsById = new Map<string, SpreadMarker<MapPoi>>()
  const markersById = new Map<string, LMarker>()
  const iconCache = new Map<string, L.DivIcon>()
  let resizeObserver: ResizeObserver
  let boundsTimer: ReturnType<typeof setTimeout> | null = null
  let markerConfig: MarkerConfig | null = null

  // Latest items snapshot, used by spread recomputation on map events.
  const latestItems = shallowRef<MapPoi[]>([])

  // ── Lifecycle ───────────────────────────────────────────────────────────

  function init(): void {
    if (phase !== 'uninitialized') return
    phase = 'loading'
    createMap()
    initLayers()
    initTileLayer()
  }

  function destroy(): void {
    resizeObserver?.disconnect()
    if (boundsTimer) {
      clearTimeout(boundsTimer)
      boundsTimer = null
    }
    iconCache.clear()
    map?.off('moveend', onMoveend)
    map?.off('zoomend', recomputeSpread)
    pointLayer?.clearLayers()
    markersById.clear()
    spreadItemsById.clear()
    map?.remove()
    phase = 'uninitialized'
  }

  function reactivate(): void {
    if (phase !== 'suspended') return
    map.invalidateSize({ debounceMoveend: true })
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) return
    phase = 'ready'
    drainDeferred()
  }

  function suspend(): void {
    if (phase !== 'ready') return
    phase = 'suspended'
  }

  // ── Map creation ──────────────────────────────────────────────────────

  function createMap(): void {
    map = L.map(mapEl.value!, {
      center: props.initialCenter,
      zoom: MAP_DEFAULT_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      preferCanvas: true,
      trackResize: false,
      zoomControl: false,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    map.on('moveend', onMoveend)
    map.on('zoomend', recomputeSpread)

    resizeObserver = new ResizeObserver(() => {
      const size = map.getSize()
      if (size.x === 0 || size.y === 0) return
      map.invalidateSize({ debounceMoveend: true })
      drainDeferred()
      recomputeSpread()
    })
    resizeObserver.observe(mapEl.value!)
  }

  function initTileLayer(): void {
    const tileUrl = __APP_CONFIG__.MAP_TILE_URL
    const attribution = __APP_CONFIG__.MAP_ATTRIBUTION
    if (!tileUrl) {
      console.error('[OsmPoiMap] MAP_TILE_URL is not configured. Map tiles will not load.')
      onReady()
      return
    }
    const tile = L.tileLayer(tileUrl, { maxZoom: MAP_MAX_ZOOM, attribution }).addTo(map)
    tile.once('load', () => onReady())
  }

  function initLayers(): void {
    pointLayer = L.layerGroup().addTo(map)
  }

  function onReady(): void {
    phase = 'ready'
    emit('map:ready', map)
    drainDeferred()
    // Initializing at the real center+zoom means Leaflet never fires a
    // moveend for the first view (no animation to settle). Emit once
    // explicitly so downstream can fetch data for the initial viewport.
    emitBounds()
    // Apply spreading once the map has real dimensions — items may have
    // arrived before the map was ready.
    recomputeSpread()
  }

  function drainDeferred(): void {
    if (deferred.highlight) {
      const point = deferred.highlight
      deferred.highlight = undefined
      showHighlight(point)
    }
  }

  // ── Bounds emission ───────────────────────────────────────────────────

  function onMoveend(): void {
    emitBounds()
    recomputeSpread()
  }

  const emitBounds = (): void => {
    if (boundsTimer) clearTimeout(boundsTimer)
    boundsTimer = setTimeout(() => {
      boundsTimer = null
      if (!map) return
      const size = map.getSize()
      if (size.x === 0 || size.y === 0) return
      const b = map.getBounds()
      emit('bounds:changed', {
        bounds: {
          south: b.getSouth(),
          north: b.getNorth(),
          west: b.getWest(),
          east: b.getEast(),
        },
        zoom: map.getZoom(),
      })
    }, BOUNDS_DEBOUNCE_MS)
  }

  // ── POI markers ───────────────────────────────────────────────────────

  function createPoiMarker(item: MapPoi, lat: number, lon: number): LMarker {
    if (!markerConfig) throw new Error('markerConfig must be set before createPoiMarker')
    const { resolveIcon, resolvePopup, fetchPopupData } = markerConfig

    const m = L.marker([lat, lon], {
      icon: hydratePoiIcon(
        resolveIcon(item),
        {
          image: item.image ?? undefined,
          isSelected: false,
          isHighlighted: item.highlighted ?? false,
          hasPost: item.hasPost,
        },
        iconCache
      ),
      keyboard: true,
    })

    m.on('click', () => {
      emit('item:select', item.id)
    })

    if (resolvePopup && supportsHover()) {
      const classes = ['item-popup', `item-popup-${item.kind}`]
      if (item.highlighted) classes.push('item-popup-highlighted')
      m.bindPopup('', {
        maxWidth: 420,
        autoPan: false,
        autoPanPadding: L.point(20, 20),
        className: classes.join(' '),
      })

      m.on('mouseover', () => {
        m.openPopup()
      })

      m.on('mouseout', () => {
        m.closePopup()
      })

      // Per-marker abort controller for the in-flight popup fetch. A fast
      // hover-sweep across markers cancels prior fetches instead of letting
      // them queue up.
      let popupAbort: AbortController | null = null

      m.on('popupopen', async (e: L.PopupEvent) => {
        const popup = e.popup
        const target = popup
          .getElement()
          ?.querySelector('.leaflet-popup-content') as HTMLElement | null
        if (target) {
          popupItem.value = item
          popupFullData.value = null
          popupTarget.value = target
        }

        if (fetchPopupData) {
          popupAbort?.abort()
          const controller = new AbortController()
          popupAbort = controller
          const itemId = item.id
          try {
            const fullData = await fetchPopupData(itemId, controller.signal)
            if (controller.signal.aborted || !popup.isOpen()) return
            if (fullData) popupFullData.value = fullData
          } catch {
            // Aborted or popup already closed — nothing useful to show.
          } finally {
            if (popupAbort === controller) popupAbort = null
          }
        }

        if (popup.isOpen()) {
          nextTick(() => popup.update())
        }
      })

      m.on('popupclose', () => {
        popupAbort?.abort()
        popupAbort = null
        popupTarget.value = null
        popupItem.value = null
        popupFullData.value = null
      })
    }

    return m
  }

  // ── Data updates ──────────────────────────────────────────────────────

  /**
   * Reconcile the layer against the latest items snapshot, then apply
   * density-based spreading at the current zoom level. Existing markers
   * keep their identity — only their lat/lng changes — so popups, hover
   * state, and Leaflet's own caches stay intact across reflows.
   */
  function recomputeSpread(): void {
    if (phase !== 'ready' || !markerConfig) return
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) return

    const items = latestItems.value
    const incomingIds = new Set(items.map((i) => i.id))

    // Drop markers whose id has left the viewport.
    for (const [id, marker] of markersById) {
      if (!incomingIds.has(id)) {
        pointLayer.removeLayer(marker)
        markersById.delete(id)
        spreadItemsById.delete(id)
      }
    }

    // Build the spread input: each item carries its true coords. Reuse the
    // previously-spread current position as a starting point so the spread
    // is stable when the map state is unchanged.
    const spreadInput: SpreadMarker<MapPoi>[] = items.map((item) => {
      const prev = spreadItemsById.get(item.id)
      const original = { lat: item.lat, lng: item.lon }
      return {
        id: item.id,
        original,
        current: prev?.current ?? original,
        data: item,
        isSpread: prev?.isSpread,
      }
    })

    const spread = spreadMarkers(spreadInput, map, map.getZoom(), SPREAD_CONFIG)

    for (const s of spread) {
      spreadItemsById.set(s.id, s)
      const existing = markersById.get(s.id)
      if (existing) {
        existing.setLatLng([s.current.lat, s.current.lng])
      } else {
        const marker = createPoiMarker(s.data, s.current.lat, s.current.lng)
        markersById.set(s.id, marker)
        pointLayer.addLayer(marker)
      }
    }
  }

  function updateMarkers(items: MapPoi[], config: MarkerConfig): void {
    markerConfig = config
    latestItems.value = items
    recomputeSpread()
  }

  // ── Highlighted location (search-driven flyTo) ────────────────────────

  function showHighlight(point: [number, number]): void {
    if (!isValidLatLng(point)) return
    if (phase !== 'ready') {
      deferred.highlight = point
      return
    }
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) {
      deferred.highlight = point
      return
    }
    map.flyTo(point, SEARCH_FOCUS_ZOOM, { duration: 1 })
  }

  // ── Helper ────────────────────────────────────────────────────────────

  function markerConfigFromProps(): MarkerConfig {
    return {
      resolveIcon: (poi: MapPoi) => props.iconResolver(poi),
      resolvePopup: props.popupResolver,
      fetchPopupData: props.fetchPopupData,
    }
  }

  // ── Vue lifecycle ─────────────────────────────────────────────────────

  onMounted(() => {
    if (!mapEl.value) return
    init()
  })

  onBeforeUnmount(() => destroy())
  onActivated(() => reactivate())
  onDeactivated(() => suspend())

  // ── Watchers ──────────────────────────────────────────────────────────

  watch(
    () => props.items,
    (items) => updateMarkers(items, markerConfigFromProps())
  )

  watch(
    () => props.highlightedLocation,
    (point) => {
      if (point) showHighlight(point)
    }
  )

  return { popupItem, popupFullData, popupTarget }
}
