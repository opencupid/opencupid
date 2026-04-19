import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import { OverlappingMarkerSpiderfier } from 'ts-overlapping-marker-spiderfier-leaflet'
import { nextTick, onMounted, onBeforeUnmount, onActivated, onDeactivated, ref, watch } from 'vue'
import type { Component, Ref } from 'vue'

import { DiffableLayer } from './DiffableLayer'
import type { MapPoi, MapCluster, BoundsWithZoom, MarkerConfig } from '../types/map.types'
import {
  isValidLatLng,
  createServerClusterIcon,
  hydratePoiIcon,
  MAP_MAX_ZOOM,
} from '../utils/mapUtils'
import { MAP_DEFAULT_ZOOM } from '@shared/maps'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MapPhase = 'uninitialized' | 'loading' | 'ready' | 'suspended'

interface DeferredWork {
  center?: [number, number]
}

export interface MapProps {
  items: MapPoi[]
  clusters?: MapCluster[]
  iconResolver: (poi: MapPoi) => Component
  popupResolver?: (poi: MapPoi) => Component
  center: [number, number]
  fetchPopupData?: (id: string) => Promise<unknown>
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
// OMS tuning constants
// ---------------------------------------------------------------------------

const SPIDERFY_COLOCATION_THRESHOLD_M = 10
const OMS_CIRCLE_FOOT_SEPARATION = 65
const OMS_SPIRAL_FOOT_SEPARATION = 50
const OMS_SPIRAL_LENGTH_START = 16
const OMS_SPIRAL_LENGTH_FACTOR = 12
const BOUNDS_DEBOUNCE_MS = 500

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useMapController(
  mapEl: Ref<HTMLDivElement | null>,
  props: MapProps,
  emit: MapEmit
) {
  // Reactive state exposed to the component
  const popupItem = ref<MapPoi | null>(null)
  const popupTarget = ref<HTMLElement | null>(null)

  // Internal mutable state
  let phase: MapPhase = 'uninitialized'
  const deferred: DeferredWork = {}
  let map: LMap
  let oms: OverlappingMarkerSpiderfier
  let pois: DiffableLayer<MapPoi>
  let clusters: DiffableLayer<MapCluster>
  let pointLayer: L.LayerGroup
  let clusterLayer: L.LayerGroup
  const iconCache = new Map<string, L.DivIcon>()
  let resizeObserver: ResizeObserver
  let boundsTimer: ReturnType<typeof setTimeout> | null = null
  let dissolvedClusterAt: L.LatLng | null = null
  let lastStableZoom: number = MAP_DEFAULT_ZOOM
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
      center: props.center,
      zoom: MAP_DEFAULT_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      preferCanvas: true,
      trackResize: false,
      zoomControl: false,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    map.on('zoomend', () => {
      lastStableZoom = map.getZoom()
    })
    map.on('moveend', emitBounds)

    resizeObserver = new ResizeObserver(() => {
      const size = map.getSize()
      if (size.x === 0 || size.y === 0) return
      map.invalidateSize({ debounceMoveend: true })
      if (deferred.center) {
        const center = deferred.center
        deferred.center = undefined
        map.setView(center, lastStableZoom)
      }
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

    oms = new OverlappingMarkerSpiderfier(map, { keepSpiderfied: true })
    oms.circleFootSeparation = OMS_CIRCLE_FOOT_SEPARATION
    oms.spiralFootSeparation = OMS_SPIRAL_FOOT_SEPARATION
    oms.spiralLengthStart = OMS_SPIRAL_LENGTH_START
    oms.spiralLengthFactor = OMS_SPIRAL_LENGTH_FACTOR

    oms.addListener('click', (marker) => {
      for (const item of pois.allItems()) {
        if (pois.get(item.id) === (marker as LMarker)) {
          emit('item:select', item.id)
          return
        }
      }
    })

    pois = new DiffableLayer<MapPoi>(pointLayer, {
      create: (item) => createPoiMarker(item),
      shouldUpdate: (prev, next) => {
        const prevUrl = prev.image?.variants?.[0]?.url
        const nextUrl = next.image?.variants?.[0]?.url
        return (
          prev.highlighted !== next.highlighted ||
          prevUrl !== nextUrl ||
          prev.hasPost !== next.hasPost
        )
      },
      apply: (marker, item) => {
        if (!markerConfig) return
        marker.setIcon(
          hydratePoiIcon(
            markerConfig.resolveIcon(item),
            {
              image: item.image,
              isSelected: false,
              isHighlighted: item.highlighted ?? false,
              hasPost: item.hasPost,
            },
            iconCache
          )
        )
      },
    })

    clusters = new DiffableLayer<MapCluster>(clusterLayer, {
      create: (cluster) => createClusterMarker(cluster),
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
    if (deferred.center) {
      const center = deferred.center
      deferred.center = undefined
      map.setView(center, lastStableZoom)
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

    const m = L.marker([item.location.lat, item.location.lon], {
      icon: hydratePoiIcon(
        resolveIcon(item),
        {
          image: item.image,
          isSelected: false,
          isHighlighted: item.highlighted ?? false,
          hasPost: item.hasPost,
        },
        iconCache
      ),
      keyboard: true,
    })

    if (resolvePopup && supportsHover()) {
      const classes = ['item-popup']
      if (item.type) classes.push(`item-popup-${item.type}`)
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

      m.on('popupopen', async (e: L.PopupEvent) => {
        const popup = e.popup
        const target = popup
          .getElement()
          ?.querySelector('.leaflet-popup-content') as HTMLElement | null
        if (target) {
          popupItem.value = item
          popupTarget.value = target
        }

        if (fetchPopupData) {
          const itemId = item.id
          try {
            const fullData = await fetchPopupData(itemId)
            if (!popup.isOpen()) return
            if (fullData && target) {
              popupItem.value = { ...item, source: fullData }
              popupTarget.value = target
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
        popupTarget.value = null
        popupItem.value = null
      })
    }

    return m
  }

  // ── Cluster markers ───────────────────────────────────────────────────

  function createClusterMarker(cluster: MapCluster): LMarker {
    const m = L.marker([cluster.location.lat, cluster.location.lon], {
      icon: createServerClusterIcon(cluster.count),
      keyboard: true,
    })

    m.on('click', () => {
      if (cluster.expansionZoom >= MAP_MAX_ZOOM) {
        clusters.update(clusters.allItems().filter((c) => c.id !== cluster.id))
        dissolvedClusterAt = L.latLng(cluster.location.lat, cluster.location.lon)
        map.setView([cluster.location.lat, cluster.location.lon], MAP_MAX_ZOOM)
      } else {
        map.flyTo([cluster.location.lat, cluster.location.lon], cluster.expansionZoom, {
          duration: 0.5,
        })
      }
    })

    return m
  }

  // ── Data updates ──────────────────────────────────────────────────────

  function doUpdateMarkers(items: MapPoi[]): void {
    if (!markerConfig) return
    const { added, removed } = pois.update(items)

    for (const m of removed) oms.removeMarker(m)
    for (const m of added) oms.addMarker(m)

    if (dissolvedClusterAt) {
      const target = dissolvedClusterAt
      dissolvedClusterAt = null
      setTimeout(() => triggerSpiderfy(target), 0)
    }
  }

  function triggerSpiderfy(target: L.LatLng): void {
    const match = [...pois.values()].find(
      (m) => m.getLatLng().distanceTo(target) < SPIDERFY_COLOCATION_THRESHOLD_M
    )
    if (!match) return
    ;(oms as any).spiderListener(match)
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

  // ── Imperative commands ───────────────────────────────────────────────

  function flyToCenter(center: [number, number]): void {
    if (!isValidLatLng(center)) return
    if (phase !== 'ready') {
      deferred.center = center
      return
    }
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) {
      deferred.center = center
      return
    }
    map.flyTo(center, lastStableZoom, { duration: 1 })
  }

  function flyToMarker(poi: MapPoi): void {
    if (phase !== 'ready') return
    map.flyTo([poi.location.lat, poi.location.lon], MAP_MAX_ZOOM, {
      animate: true,
      duration: 0.6,
    })
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
    () => props.center,
    (center) => {
      if (center) flyToCenter(center)
    }
  )

  return { flyToMarker, popupItem, popupTarget }
}
