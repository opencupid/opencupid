<script setup lang="ts">
import { onMounted, onBeforeUnmount, onActivated, ref, watch, nextTick, type Component } from 'vue'
import type { Ref } from 'vue'
import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { OverlappingMarkerSpiderfier } from 'ts-overlapping-marker-spiderfier-leaflet'

import type { MapPoi, MapCluster, BoundsWithZoom } from './OsmPoiMap.types'
import { isValidLatLng, createServerClusterIcon, hydratePoiIcon, MAP_MAX_ZOOM } from './mapUtils'

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
    selectedId?: string | number
    highlightedPoiId?: string | number | null
    fitToPois?: boolean
    fetchPopupData?: (id: string | number) => Promise<unknown>
  }>(),
  {
    zoom: 7,
    fitToPois: false,
    clusters: () => [],
  }
)

const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds-changed', payload: BoundsWithZoom): void
}>()

const mapEl: Ref<HTMLDivElement | null> = ref(null)
const backdropPaneEl: Ref<HTMLElement | null> = ref(null)
let map: LMap | null = null
let markers = new Map<string | number, LMarker>()
let itemsById = new Map<string | number, MapPoi>()
const iconCache = new Map<string, L.DivIcon>()
let clusterLayer: L.LayerGroup | null = null
let clusterMarkers = new Map<number, LMarker>()
// Tracks the zoom level from the last completed zoom animation. Used by the
// center watcher to avoid capturing a mid-flyTo intermediate zoom value.
let lastStableZoom: number = props.zoom
let isMapReady = false
let pendingCenter: [number, number] | null = null
let boundsDebounceTimer: ReturnType<typeof setTimeout> | null = null
let suppressBoundsEmit = false
let resizeObserver: ResizeObserver | null = null

let pointLayer: L.LayerGroup | null = null
let oms: OverlappingMarkerSpiderfier | null = null
const markerItems = new WeakMap<LMarker, MapPoi>()
let pendingSpiderfyLatLng: L.LatLng | null = null
const clusterData = new WeakMap<LMarker, MapCluster>()

function emitBounds() {
  if (boundsDebounceTimer) clearTimeout(boundsDebounceTimer)
  boundsDebounceTimer = setTimeout(() => {
    boundsDebounceTimer = null
    if (suppressBoundsEmit) return
    if (!map) return
    // Suppress bounds-changed while a popup is open — autopan from popup open
    // would trigger a data fetch → rerender → close the popup the user just opened.
    if (popupTarget.value) return
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) return
    const b = map.getBounds()
    emit('bounds-changed', {
      bounds: {
        south: b.getSouth(),
        north: b.getNorth(),
        west: b.getWest(),
        east: b.getEast(),
      },
      zoom: map.getZoom(),
    })
  }, 300)
}

// --- map init orchestration -------------------------------------------------

function ensureMap() {
  if (map || !mapEl.value) return

  map = createLeafletMap(mapEl.value)
  // Custom pane between marker-pane (600) and popup-pane (700) so the
  // backdrop blocks marker/spider clicks but popups remain clickable.
  const backdropPane = map.createPane('backdropPane')
  backdropPane.style.zIndex = '699'
  backdropPaneEl.value = backdropPane
  initBaseLayer(map)
  initLayers(map)
}

function createLeafletMap(el: HTMLDivElement): LMap {
  const m = L.map(el, {
    center: props.center ?? [0, 0],
    zoom: props.center ? props.zoom : 2,
    maxZoom: MAP_MAX_ZOOM,
    preferCanvas: true,
    trackResize: false,
  })

  // ResizeObserver pattern from Leaflet v2 (#9010): skip resize when the
  // container is hidden (zero dimensions) to prevent NaN in projection math.
  // When dimensions return (e.g. KeepAlive reactivation), invalidateSize and
  // replay any deferred flyTo.
  resizeObserver = new ResizeObserver(() => {
    const size = m.getSize()
    if (size.x === 0 || size.y === 0) return
    m.invalidateSize({ debounceMoveend: true })
    if (pendingCenter) {
      m.flyTo(pendingCenter, lastStableZoom, { duration: 1 })
      pendingCenter = null
    }
  })
  resizeObserver.observe(el)

  return m
}

function initBaseLayer(map: LMap): void {
  // Keep lastStableZoom in sync with the map so the center watcher always
  // uses the zoom from the last *completed* animation, never a mid-flyTo value.
  map.on('zoomend', () => {
    if (map) {
      lastStableZoom = map.getZoom()
    }
  })
  map.on('moveend', emitBounds)
  const tileUrl = __APP_CONFIG__.MAP_TILE_URL
  if (!tileUrl) {
    console.error('[OsmPoiMap] MAP_TILE_URL is not configured. Map tiles will not load.')
    onMapReady()
    return
  }
  const tileLayer = L.tileLayer(tileUrl, {
    maxZoom: MAP_MAX_ZOOM,
    attribution: __APP_CONFIG__.MAP_ATTRIBUTION,
  }).addTo(map)
  tileLayer.once('load', () => onMapReady())
}

// Max distance in metres between two markers considered co-located for spiderfy grouping.
const SPIDERFY_COLOCATION_THRESHOLD_M = 10

// OMS tuning for large avatar markers (defaults are sized for tiny pin icons).
// Tune in browser console: oms.circleFootSeparation = 120, etc.
const OMS_CIRCLE_FOOT_SEPARATION = 65
const OMS_SPIRAL_FOOT_SEPARATION = 50
const OMS_SPIRAL_LENGTH_START = 16
const OMS_SPIRAL_LENGTH_FACTOR = 12
function triggerSpiderfy(target: L.LatLng) {
  if (!oms || !map) return
  const match = [...markers.values()].find(
    (m) => m.getLatLng().distanceTo(target) < SPIDERFY_COLOCATION_THRESHOLD_M
  )
  if (!match) return
  ;(oms as any).spiderListener(match)
}

function initLayers(map: LMap) {
  pointLayer = L.layerGroup().addTo(map)
  clusterLayer = L.layerGroup().addTo(map)
  oms = new OverlappingMarkerSpiderfier(map, { keepSpiderfied: true })
  oms.circleFootSeparation = OMS_CIRCLE_FOOT_SEPARATION
  oms.spiralFootSeparation = OMS_SPIRAL_FOOT_SEPARATION
  oms.spiralLengthStart = OMS_SPIRAL_LENGTH_START
  oms.spiralLengthFactor = OMS_SPIRAL_LENGTH_FACTOR
  oms.addListener('click', (marker) => {
    const item = markerItems.get(marker as LMarker)
    if (!item) return
    if (props.popupComponent) (marker as LMarker).openPopup()
    else emit('item:select', item.id)
  })
}

const popupTarget = ref<HTMLElement | null>(null)
const popupItem = ref<MapPoi | null>(null)

function closeActivePopup() {
  map?.closePopup()
}

function onMapReady() {
  if (!map) return
  isMapReady = true
  emit('map:ready', map)
  updateMarkers(true)
}

function resolveIcon(item: MapPoi): Component {
  return props.iconResolver ? props.iconResolver(item) : props.iconComponent
}

function createMarker(item: MapPoi): LMarker {
  const isSelected = item.id === props.selectedId
  const m = L.marker([item.location.lat, item.location.lon], {
    title: item.title,
    icon: hydratePoiIcon(
      resolveIcon(item),
      {
        image: item.image,
        isSelected,
        isHighlighted: item.highlighted ?? false,
      },
      iconCache
    ),
    keyboard: true,
  })

  if (props.popupComponent) {
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
      popupTarget.value = target
      popupItem.value = item

      if (props.fetchPopupData) {
        const itemId = item.id
        try {
          const fullData = await props.fetchPopupData(itemId)
          if (!popup.isOpen()) return
          if (fullData && popupItem.value?.id === itemId) {
            popupItem.value = { ...item, source: fullData }
          }
        } catch {
          // Swallow – popup may already be closed; nothing useful to show.
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

  markerItems.set(m, item)
  return m
}

function updateMarkers(forceRebuild = false) {
  if (!map || !pointLayer || !isMapReady) return
  const size = map.getSize()
  if (size.x === 0 || size.y === 0) return

  if (forceRebuild) {
    pointLayer.clearLayers()
    oms?.clearMarkers()
    markers.clear()
    itemsById.clear()
  }

  const incoming = new Map<string | number, MapPoi>()
  for (const item of props.items) {
    incoming.set(item.id, item)
  }

  // Remove markers no longer in the incoming list
  const toRemove: LMarker[] = []
  for (const [id, marker] of markers) {
    if (!incoming.has(id)) {
      toRemove.push(marker)
      markers.delete(id)
      itemsById.delete(id)
    }
  }

  // Add new markers or update changed ones in-place
  const toAdd: LMarker[] = []
  for (const [id, item] of incoming) {
    const existing = itemsById.get(id)
    if (!existing) {
      const marker = createMarker(item)
      markers.set(id, marker)
      itemsById.set(id, item)
      toAdd.push(marker)
    } else {
      // Always keep itemsById in sync so popup/click handlers see current data
      itemsById.set(id, item)
      const imageUrl = item.image?.variants?.[0]?.url
      const existingUrl = existing.image?.variants?.[0]?.url
      if (existing.highlighted !== item.highlighted || imageUrl !== existingUrl) {
        const marker = markers.get(id)!
        marker.setIcon(
          hydratePoiIcon(
            resolveIcon(item),
            {
              image: item.image,
              isSelected: id === props.selectedId,
              isHighlighted: item.highlighted ?? false,
            },
            iconCache
          )
        )
      }
    }
  }

  for (const m of toRemove) {
    pointLayer.removeLayer(m)
    oms?.removeMarker(m)
  }
  for (const m of toAdd) {
    pointLayer.addLayer(m)
    oms?.addMarker(m)
  }

  // After dissolving a max-zoom cluster, auto-spiderfy the co-located leaf markers.
  if (pendingSpiderfyLatLng) {
    const target = pendingSpiderfyLatLng
    pendingSpiderfyLatLng = null
    const match = [...markers.values()].find((m) => m.getLatLng().distanceTo(target) < 1)
    if (match) setTimeout(() => triggerSpiderfy(target), 0)
  }

  // Only fitBounds on initial load (all markers are new, none removed)
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

function updateClusterMarkers() {
  if (!map || !clusterLayer) return

  const incoming = new Map<number, MapCluster>()
  for (const cluster of props.clusters ?? []) {
    incoming.set(cluster.id, cluster)
  }

  // Remove stale cluster markers
  for (const [id, marker] of clusterMarkers) {
    if (!incoming.has(id)) {
      clusterLayer.removeLayer(marker)
      clusterMarkers.delete(id)
    }
  }

  // Add new or update existing cluster markers
  for (const [id, cluster] of incoming) {
    const existing = clusterMarkers.get(id)
    if (!existing) {
      const m = L.marker([cluster.location.lat, cluster.location.lon], {
        icon: createServerClusterIcon(cluster.count),
        keyboard: true,
      })
      clusterData.set(m, cluster)
      m.on('click', () => {
        if (!map) return
        const data = clusterData.get(m)
        if (!data) return
        if (data.expansionZoom >= MAP_MAX_ZOOM) {
          // At max zoom the cluster dissolves into individual points — remove it
          // immediately so it cannot intercept the next click on a leaf marker.
          // Store the latlng so updateMarkers can auto-spiderfy after the leaves arrive.
          clusterLayer?.removeLayer(m)
          clusterMarkers.delete(id)
          pendingSpiderfyLatLng = L.latLng(data.location.lat, data.location.lon)
          map.setView([data.location.lat, data.location.lon], MAP_MAX_ZOOM)
        } else {
          map.flyTo([data.location.lat, data.location.lon], data.expansionZoom, {
            duration: 0.5,
          })
        }
      })
      clusterLayer.addLayer(m)
      clusterMarkers.set(id, m)
    } else {
      existing.setLatLng([cluster.location.lat, cluster.location.lon])
      existing.setIcon(createServerClusterIcon(cluster.count))
      clusterData.set(existing, cluster)
    }
  }
}

function highlightSelected() {
  if (!map) return
  for (const [id, marker] of markers) {
    const item = itemsById.get(id)
    if (!item) continue
    marker.setIcon(
      hydratePoiIcon(
        resolveIcon(item),
        {
          image: item.image,
          isSelected: id === props.selectedId,
          isHighlighted: item.highlighted ?? false,
        },
        iconCache
      )
    )
  }
  if (props.selectedId != null) {
    const m = markers.get(props.selectedId)
    if (m) {
      // Center and open its popup
      map.setView(m.getLatLng(), MAP_MAX_ZOOM)
      m.openPopup()
    }
  }
}

function flyToMarker(poi: MapPoi) {
  if (!map) return
  map.flyTo([poi.location.lat, poi.location.lon], Math.max(map.getZoom(), 13), {
    animate: true,
    duration: 0.6,
  })
}

defineExpose({ flyToMarker })

onMounted(() => {
  ensureMap()
})

function destroyMap() {
  if (!map) return
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (boundsDebounceTimer) {
    clearTimeout(boundsDebounceTimer)
    boundsDebounceTimer = null
  }
  iconCache.clear()
  map.off('moveend', emitBounds)

  pointLayer?.clearLayers()
  pointLayer = null
  oms?.clearMarkers()
  oms = null
  clusterLayer?.clearLayers()
  clusterLayer = null
  clusterMarkers.clear()

  map.remove()
  map = null
}

onBeforeUnmount(() => {
  destroyMap()
})

onActivated(() => {
  if (!map) return
  map.invalidateSize()
  const size = map.getSize()
  if (size.x === 0 || size.y === 0) return
  if (pendingCenter) {
    map.flyTo(pendingCenter, lastStableZoom, { duration: 1 })
    pendingCenter = null
  }
  updateMarkers(true)
  updateClusterMarkers()
})

watch(
  () => props.items,
  () => updateMarkers()
)

watch(
  () => props.clusters,
  () => {
    updateClusterMarkers()
  }
)

watch(
  () => props.selectedId,
  () => {
    highlightSelected()
  }
)

watch(
  () => props.center,
  (newCenter) => {
    if (!map || !isValidLatLng(newCenter)) return
    const size = map.getSize()
    if (size.x === 0 || size.y === 0) {
      pendingCenter = newCenter
      return
    }
    map.flyTo(newCenter, lastStableZoom, { duration: 1 })
  }
)
</script>

<template>
  <div class="osm-poi-map-wrapper">
    <div
      class="osm-poi-map"
      ref="mapEl"
    />

    <!-- Backdrop absorbs marker/spider clicks while a popup is open, preventing
         OMS unspiderfy. Teleported into a custom Leaflet pane (z-index 699)
         so it sits between the marker pane (600) and popup pane (700). -->
    <Teleport
      v-if="popupTarget && backdropPaneEl"
      :to="backdropPaneEl"
    >
      <div
        class="map-popup-backdrop"
        @click.stop="closeActivePopup"
      />
    </Teleport>

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
  /* Set an explicit height, or it won't be visible */
  height: 100%;
  width: 100%;
}

/* Invisible overlay inside the custom backdropPane (z-index 699).
   Oversized to cover the viewport regardless of the map pane's
   transform offset that shifts on every pan. */
.map-popup-backdrop {
  position: absolute;
  top: -100vh;
  left: -100vw;
  width: 300vw;
  height: 300vh;
  cursor: pointer;
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

/* Fade-in for markers appearing on the map */
:deep(.poi-cluster-icon) {
  z-index: 5000; /* above regular markers but below hovered avatar icons */
}

/* Avatar marker hover feedback — scale the inner img, not the icon wrapper
   (Leaflet uses transform on the wrapper for positioning) */
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
  /* TODO remove hardcoded color - replace with semantic value */
  box-shadow: 0 3px 13px rgba(217, 83, 79, 0.9);
}

:deep(.item-popup-highlighted .leaflet-popup-tip) {
  /* TODO remove hardcoded color - replace with semantic value */
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

/* Override Bootstrap's card hover lift inside map popups */
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
