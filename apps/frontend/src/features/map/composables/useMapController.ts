import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import { nextTick, onMounted, onBeforeUnmount, onActivated, onDeactivated, ref, watch } from 'vue'
import type { Component, Ref } from 'vue'

import { DiffableLayer } from './DiffableLayer'
import type {
  MapPoi,
  MapCluster,
  BoundsWithZoom,
  MarkerConfig,
  IconRenderer,
} from '../types/map.types'
import {
  isValidLatLng,
  createServerClusterIcon,
  hydratePoiIcon,
  MAP_MAX_ZOOM,
} from '../utils/mapUtils'
import { DEFAULT_SPREAD_CONFIG, spreadMarkers, type SpreadConfig } from '../utils/markerSpreading'
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
  clusters?: MapCluster[]
  iconResolver: (poi: MapPoi) => IconRenderer
  popupResolver?: (poi: MapPoi) => Component
  initialCenter: [number, number]
  highlightedLocation?: [number, number] | null
  fetchPopupData?: (id: string, signal?: AbortSignal) => Promise<unknown>
  /**
   * Overrides for the density-based marker spreading. Any unset fields fall
   * back to DEFAULT_SPREAD_CONFIG. Passing `null` is not supported — to
   * disable spreading entirely, set `disableAtZoom` lower than any zoom the
   * map can reach.
   */
  spreadConfig?: Partial<SpreadConfig>
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
// Tuning constants
// ---------------------------------------------------------------------------

const BOUNDS_DEBOUNCE_MS = 500
const SEARCH_FOCUS_ZOOM = 12

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
  let pois: DiffableLayer<MapPoi>
  let clusters: DiffableLayer<MapCluster>
  let pointLayer: L.LayerGroup
  let clusterLayer: L.LayerGroup
  const iconCache = new Map<string, L.DivIcon>()
  let resizeObserver: ResizeObserver
  let boundsTimer: ReturnType<typeof setTimeout> | null = null
  let markerConfig: MarkerConfig | null = null
  const spreadConfig: SpreadConfig = { ...DEFAULT_SPREAD_CONFIG, ...props.spreadConfig }

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
    map?.off('moveend', emitBounds)
    pois?.clear()
    clusters?.clear()
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

    map.on('moveend', emitBounds)
    map.on('moveend', recomputeSpreading)
    map.on('zoomend', recomputeSpreading)
    map.on('resize', recomputeSpreading)

    resizeObserver = new ResizeObserver(() => {
      const size = map.getSize()
      if (size.x === 0 || size.y === 0) return
      map.invalidateSize({ debounceMoveend: true })
      drainDeferred()
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
    clusterLayer = L.layerGroup().addTo(map)

    // POI data is treated as immutable per id for the lifetime of a session
    // (the GUI is not expected to reflect mid-session DB changes). No
    // shouldUpdate/apply: existing markers are never re-rendered, only
    // added on first sighting and removed when their id leaves the viewport.
    pois = new DiffableLayer<MapPoi>(pointLayer, {
      create: (item) => createPoiMarker(item),
    })

    // Clusters share the immutable-per-id contract with POIs: cluster_id
    // is supercluster's per-index identifier and the index is cached per
    // (profile, tagIds) on the backend, so within a session the same id
    // always carries the same fields. Filter changes produce entirely
    // different ids (different cache key → different index), not same
    // ids with different counts.
    clusters = new DiffableLayer<MapCluster>(clusterLayer, {
      create: (cluster) => createClusterMarker(cluster),
    })
  }

  function onReady(): void {
    phase = 'ready'
    emit('map:ready', map)
    drainDeferred()
    // Initializing at the real center+zoom means Leaflet never fires a
    // moveend for the first view (no animation to settle). Emit once
    // explicitly so downstream can fetch data for the initial viewport.
    emitBounds()
  }

  function drainDeferred(): void {
    if (deferred.highlight) {
      const point = deferred.highlight
      deferred.highlight = undefined
      showHighlight(point)
    }
  }

  // ── Bounds emission ───────────────────────────────────────────────────

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

  function createPoiMarker(item: MapPoi): LMarker {
    if (!markerConfig) throw new Error('markerConfig must be set before createPoiMarker')
    const { resolveIcon, resolvePopup, fetchPopupData } = markerConfig

    const m = L.marker([item.lat, item.lon], {
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

    // OMS previously owned this click; without it, every marker emits
    // item:select directly. The hover-bound click below additionally
    // closes the popup on desktops — that's a popup-UX concern, kept
    // separate from selection.
    m.on('click', () => emit('item:select', String(item.id)))

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

      m.on('click', () => {
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

  // ── Cluster markers ───────────────────────────────────────────────────

  function createClusterMarker(cluster: MapCluster): LMarker {
    const m = L.marker([cluster.lat, cluster.lon], {
      icon: createServerClusterIcon(cluster.count),
      keyboard: true,
    })

    m.on('click', () => {
      if (cluster.expansionZoom >= MAP_MAX_ZOOM) {
        // At max zoom the supercluster index can't subdivide further. Drop the
        // cluster icon and rely on density-based spreading to make the
        // colocated leaves individually clickable once they arrive.
        clusters.update(clusters.allItems().filter((c) => c.id !== cluster.id))
        map.setView([cluster.lat, cluster.lon], MAP_MAX_ZOOM)
      } else {
        map.flyTo([cluster.lat, cluster.lon], cluster.expansionZoom, {
          duration: 0.5,
        })
      }
    })

    return m
  }

  // ── Data updates ──────────────────────────────────────────────────────

  function doUpdateMarkers(items: MapPoi[]): void {
    if (!markerConfig) return
    pois.update(items)
    recomputeSpreading()
  }

  /**
   * Re-plan marker positions: detect overlapping groups in container-pixel
   * space and spiral them out by a zoom-scaled radius. Cheap enough to run
   * synchronously on every map view change (the algorithm is O(n²) in the
   * on-screen marker count, which the pipeline keeps below a few hundred).
   */
  function recomputeSpreading(): void {
    if (phase !== 'ready' || !map) return
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) return

    const items = pois.allItems()
    if (items.length === 0) return

    const inputs = items.map((it) => ({ id: it.id, lat: it.lat, lng: it.lon }))
    const plans = spreadMarkers(inputs, map, map.getZoom(), spreadConfig)
    for (const plan of plans) {
      const marker = pois.get(plan.marker.id)
      if (!marker) continue
      const current = marker.getLatLng()
      if (current.lat === plan.lat && current.lng === plan.lng) continue
      marker.setLatLng([plan.lat, plan.lng])
    }
  }

  function updateMarkers(items: MapPoi[], config: MarkerConfig): void {
    markerConfig = config
    if (phase !== 'ready') return
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) return
    doUpdateMarkers(items)
  }

  function updateClusters(newClusters: MapCluster[]): void {
    if (phase !== 'ready') return
    clusters.update(newClusters)
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
    () => props.clusters,
    (newClusters) => updateClusters(newClusters ?? [])
  )

  watch(
    () => props.highlightedLocation,
    (point) => {
      if (point) showHighlight(point)
    }
  )

  return { popupItem, popupFullData, popupTarget }
}
