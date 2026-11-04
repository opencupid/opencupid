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
  MapBounds,
  MapTarget,
} from '../types/map.types'
import {
  isValidLatLng,
  createServerClusterIcon,
  hydratePoiIcon,
  MAP_MAX_ZOOM,
} from '../utils/mapUtils'
import { MAP_CLUSTER_RADIUS, MAP_DEFAULT_ZOOM } from '@shared/maps'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MapPhase = 'uninitialized' | 'loading' | 'ready' | 'suspended'

interface DeferredWork {
  highlight?: [number, number]
  focusBounds?: MapBounds
}

export interface MapProps {
  items: MapPoi[]
  clusters?: MapCluster[]
  iconResolver: (poi: MapPoi) => IconRenderer
  popupResolver?: (poi: MapPoi) => Component
  initialCenter: [number, number]
  highlightedLocation?: [number, number] | null
  /** Area to fit the map to, e.g. a place picked in the grid's location field. */
  focusBounds?: MapBounds | null
  /** Item to emphasise, e.g. while its grid card is hovered. */
  emphasizedPoi?: MapTarget | null
  /** Item to pulse once; pass a new object each time to pulse again. */
  pulsePoi?: MapTarget | null
  fetchPopupData?: (id: string, signal?: AbortSignal) => Promise<unknown>
}

type MapEmit = {
  (e: 'bounds:changed', payload: BoundsWithZoom): void
  (e: 'item:select', id: string): void
  (e: 'map:ready', map: LMap): void
  /** A cluster that does not split any further was clicked. */
  (e: 'cluster:max-zoom'): void
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
  let markerConfig: MarkerConfig | null = null

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
    if (pulseTimer) clearTimeout(pulseTimer)
    pulseTimer = null
    pulsing = null
    emphasized = undefined
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
    if (deferred.focusBounds) {
      const bounds = deferred.focusBounds
      deferred.focusBounds = undefined
      // The map is only now appearing, so there is nothing to fly from: jump,
      // so the first viewport it reports is already the requested one.
      showFocusBounds(bounds, false)
    }
  }

  // ── Bounds emission ───────────────────────────────────────────────────

  // Leaflet fires moveend once a move has settled, so every one is reported:
  // consumers need the current viewport, and debounce their own fetches.
  const emitBounds = (): void => {
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
  }

  // ── POI markers ───────────────────────────────────────────────────────

  function poiIcon(item: MapPoi, resolveIcon: MarkerConfig['resolveIcon']): L.DivIcon {
    return hydratePoiIcon(
      resolveIcon(item),
      {
        image: item.image ?? undefined,
        isSelected: false,
        isHighlighted: item.highlighted ?? false,
        hasPost: item.hasPost,
      },
      iconCache
    )
  }

  /**
   * Re-render the icon of every existing POI marker. POI data is immutable per
   * id, but the icon resolver is not (e.g. it depends on the viewer's photo
   * access), so a new resolver must be applied to markers already on the map.
   */
  function refreshPoiIcons(config: MarkerConfig): void {
    markerConfig = config
    if (phase === 'uninitialized') return
    for (const item of pois.allItems()) {
      pois.get(item.id)?.setIcon(poiIcon(item, config.resolveIcon))
    }
  }

  function createPoiMarker(item: MapPoi): LMarker {
    if (!markerConfig) throw new Error('markerConfig must be set before createPoiMarker')
    const { resolveIcon, resolvePopup, fetchPopupData } = markerConfig

    const m = L.marker([item.lat, item.lon], {
      icon: poiIcon(item, resolveIcon),
      keyboard: true,
    })

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
        // The backend clusters up to max zoom, so this cluster never splits:
        // centre on it and let the host open the grid, which lists the area
        // nearest-first from the map centre, i.e. the cluster's members first.
        map.setView([cluster.lat, cluster.lon], MAP_MAX_ZOOM)
        emit('cluster:max-zoom')
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
    refreshTargets()
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
    refreshTargets()
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

  function showFocusBounds(bounds: MapBounds, animate = true): void {
    const size = phase === 'ready' ? map.getSize() : null
    if (!size || size.x === 0 || size.y === 0) {
      deferred.focusBounds = bounds
      return
    }
    const latLngs: L.LatLngBoundsLiteral = [
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    ]
    if (animate) map.flyToBounds(latLngs, { duration: 1 })
    else map.fitBounds(latLngs)
  }

  // ── Marker emphasis and pulse (browse grid ↔ map) ─────────────────────
  // Applied as classes on the marker element, so the immutable-per-id
  // markers are never re-created. An item inside a cluster has no marker of
  // its own, so the cluster holding it is pointed at instead. Both are
  // re-resolved after every marker or cluster update, as the item's marker
  // can change while the map moves (e.g. flying in for "show on map").

  const EMPHASIS_CLASS = 'poi-emphasized'
  const PULSE_CLASS = 'poi-pulse'
  const PULSE_MS = 3000
  // A cluster's members lie within one radius of its seed, and the seed
  // within one radius of the cluster's centre; the radius is in
  // Supercluster's 512-px extent, half as many pixels on 256-px tiles.
  const CLUSTER_REACH_PX = 2 * (MAP_CLUSTER_RADIUS / 2)

  function clusterElementAt(point: { lat: number; lon: number }): HTMLElement | undefined {
    const at = map.latLngToContainerPoint([point.lat, point.lon])
    let nearest: { id: number; distance: number } | null = null
    for (const c of clusters.allItems()) {
      const distance = at.distanceTo(map.latLngToContainerPoint([c.lat, c.lon]))
      if (distance <= CLUSTER_REACH_PX && (!nearest || distance < nearest.distance)) {
        nearest = { id: c.id, distance }
      }
    }
    return nearest ? clusters.get(nearest.id)?.getElement() : undefined
  }

  function targetElement(target: MapTarget | null | undefined): HTMLElement | undefined {
    if (!target || phase !== 'ready') return undefined
    const own = pois.get(target.id)?.getElement()
    if (own) return own
    return target.point ? clusterElementAt(target.point) : undefined
  }

  let emphasized: HTMLElement | undefined

  function applyEmphasis(): void {
    const el = targetElement(props.emphasizedPoi)
    if (el === emphasized) return
    emphasized?.classList.remove(EMPHASIS_CLASS)
    el?.classList.add(EMPHASIS_CLASS)
    emphasized = el
  }

  // The pulse lasts PULSE_MS from the request and follows its item to
  // whichever marker shows it, e.g. once the map has flown there.
  let pulsing: { target: MapTarget; el?: HTMLElement } | null = null
  let pulseTimer: ReturnType<typeof setTimeout> | null = null

  function pulse(target: MapTarget): void {
    pulsing?.el?.classList.remove(PULSE_CLASS)
    pulsing = { target }
    if (pulseTimer) clearTimeout(pulseTimer)
    pulseTimer = setTimeout(endPulse, PULSE_MS)
    applyPulse()
  }

  function applyPulse(): void {
    if (!pulsing) return
    const el = targetElement(pulsing.target)
    if (el === pulsing.el) return
    pulsing.el?.classList.remove(PULSE_CLASS)
    if (el) {
      // Restart the CSS animation when the same marker is pulsed again.
      el.classList.remove(PULSE_CLASS)
      void el.offsetWidth
      el.classList.add(PULSE_CLASS)
    }
    pulsing.el = el
  }

  function endPulse(): void {
    pulsing?.el?.classList.remove(PULSE_CLASS)
    pulsing = null
    pulseTimer = null
  }

  function refreshTargets(): void {
    applyEmphasis()
    applyPulse()
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
    () => props.iconResolver,
    () => refreshPoiIcons(markerConfigFromProps())
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

  watch(() => props.emphasizedPoi, applyEmphasis)

  watch(
    () => props.pulsePoi,
    (target) => {
      if (target) pulse(target)
    }
  )

  // Immediate: a fit requested before the map exists (e.g. a grid link's
  // bbox, set while the page sets up) is deferred until the map is ready.
  watch(
    () => props.focusBounds,
    (bounds) => {
      if (bounds) showFocusBounds(bounds)
    },
    { immediate: true }
  )

  return { popupItem, popupFullData, popupTarget }
}
