<script setup lang="ts" generic="T extends { id: string | number }">
import { onMounted, onBeforeUnmount, ref, watch, nextTick, type Component, render, h } from 'vue'
import type { Ref } from 'vue'
import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import '@maptiler/sdk/dist/maptiler-sdk.css'

import { MaptilerLayer } from '@maptiler/leaflet-maptilersdk'
import { config as maptilerConfig, MapStyle } from '@maptiler/sdk'

import AvatarIcon, { type AvatarImage } from './AvatarIcon.vue'

/** Basic POI shape for location data extraction */
export interface PoiItem {
  id: string | number
  location?: {
    lat?: number | null
    lon?: number | null
  }
}

maptilerConfig.telemetry = false

// Guard against _update firing after map removal (#1035, #1026).
// TODO: Remove this monkey-patch when fixed upstream in @maptiler/leaflet-maptilersdk.
// GitHub issue: https://github.com/opencupid/opencupid/issues/1026
const origUpdate = MaptilerLayer.prototype._update
MaptilerLayer.prototype._update = function (...args: unknown[]) {
  if (!this._map) return
  return origUpdate.apply(this, args)
}

const props = withDefaults(
  defineProps<{
    /** Items to display on the map (must have id and location with lat/lon) */
    items: T[]
    /** Function to extract location from an item */
    getLocation: (item: T) => { lat?: number | null; lon?: number | null } | null | undefined
    /** Function to get title for marker */
    getTitle: (item: T) => string
    /** Vue component to render in popup */
    popupComponent: Component
    /** Optional starting center/zoom (used if we can't fit to bounds) */
    center?: [number, number]
    zoom?: number
    /** Optional function to get a profile image (with variants + blurhash) for an item */
    getImage?: (item: T) => AvatarImage | undefined
    /** ID of selected item to highlight */
    selectedId?: string | number
    /** Whether to auto-fit the map to show all items */
    fitToPois?: boolean
    /** Optional callback to determine if an item should have a highlight halo */
    isHighlighted?: (item: T) => boolean
  }>(),
  {
    zoom: 7,
    fitToPois: false,
  }
)

const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds-changed', bounds: { south: number; north: number; west: number; east: number }): void
}>()

const mapEl: Ref<HTMLDivElement | null> = ref(null)
let map: LMap | null = null
let markers = new Map<string | number, LMarker>()
let itemsById = new Map<string | number, T>()
// Tracks the zoom level from the last completed zoom animation. Used by the
// center watcher to avoid capturing a mid-flyTo intermediate zoom value.
let lastStableZoom: number = props.zoom

function customClusterIcon(cluster: any): L.DivIcon {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `<div class="poi-cluster-badge">${count}</div>`,
    className: 'poi-cluster-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// Spiderfy hover region
type MCCluster = any

const SPIDER_HOVER_PADDING_PX = 18

let activeSpiderCluster: MCCluster | null = null
let activeSpiderHoverBounds: L.LatLngBounds | null = null

function computeViewportMultiplier(map: L.Map) {
  const { x: w, y: h } = map.getSize()
  const minDim = Math.min(w, h)

  // Heuristic: on a ~800px tall map => multiplier ~1.6
  // Tune the divisor to your liking.
  return Math.max(0.8, Math.min(4, minDim / 400))
}

function computeSpiderHoverBounds(
  map: LMap,
  cluster: MCCluster,
  paddingPx = SPIDER_HOVER_PADDING_PX
): L.LatLngBounds {
  const children: LMarker[] = cluster.getAllChildMarkers?.() ?? []
  if (!children.length) {
    // Defensive guard: if plugin reports no children (transient state / API mismatch),
    // return a valid bounds around the cluster center (avoids Infinity bounds).
    const ll = cluster.getLatLng?.() ?? map.getCenter()
    return L.latLngBounds(ll, ll)
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const m of children) {
    const p = map.latLngToLayerPoint(m.getLatLng())
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }

  minX -= paddingPx
  minY -= paddingPx
  maxX += paddingPx
  maxY += paddingPx

  // Convert back to LatLng bounds.
  // y grows downward in layer points: (minX, maxY) is bottom-left, (maxX, minY) is top-right.
  const sw = map.layerPointToLatLng(L.point(minX, maxY))
  const ne = map.layerPointToLatLng(L.point(maxX, minY))
  return L.latLngBounds(sw, ne)
}

function closeSpider() {
  if (activeSpiderCluster) {
    activeSpiderCluster.unspiderfy?.()
  }
  activeSpiderCluster = null
  activeSpiderHoverBounds = null
}

let clusterGroup: any = null

function avatarIcon(image: AvatarImage, isSelected: boolean, isHighlighted: boolean): L.DivIcon {
  const size = 32

  const container = document.createElement('span')
  render(h(AvatarIcon, { image, isHighlighted, isSelected }), container)
  return L.divIcon({
    className: 'poi-avatar-icon',
    html: container,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// TODO - refactor this the same way as avatarIcon
function dotIcon(isSelected: boolean, isHighlighted: boolean): L.DivIcon {
  const classes = ['poi-dot']
  if (isSelected) classes.push('selected')
  if (isHighlighted) classes.push('highlighted')
  return L.divIcon({
    className: isSelected ? 'poi-selected-icon' : 'poi-default-icon',
    html: `<div class="${classes.join(' ')}"></div>`,
    iconSize: isSelected ? [20, 20] : [16, 16],
    iconAnchor: isSelected ? [10, 10] : [8, 8],
  })
}

function iconForItem(item: T, isSelected: boolean): L.DivIcon {
  const highlighted = props.isHighlighted?.(item) ?? false
  const image = props.getImage?.(item)
  if (image) return avatarIcon(image, isSelected, highlighted)
  return dotIcon(isSelected, highlighted)
}

function emitBounds() {
  if (!map) return
  const b = map.getBounds()
  emit('bounds-changed', {
    south: b.getSouth(),
    north: b.getNorth(),
    west: b.getWest(),
    east: b.getEast(),
  })
}

function webGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

function initRasterFallback(map: LMap): void {
  const tileLayer = L.tileLayer(
    `https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=${__APP_CONFIG__.MAPTILER_API_KEY}`,
    { maxZoom: 19, attribution: '© MapTiler © OpenStreetMap contributors' }
  ).addTo(map)
  tileLayer.once('load', () => emit('map:ready', map))
}
// --- map init orchestration -------------------------------------------------

function ensureMap() {
  if (map || !mapEl.value) return

  map = createLeafletMap(mapEl.value)
  initBaseLayer(map)
  initClusters(map)
}

function createLeafletMap(el: HTMLDivElement): LMap {
  return L.map(el, {
    center: props.center ?? [0, 0],
    zoom: props.center ? props.zoom : 2,
    maxZoom: 19,
    preferCanvas: true,
  })
}

function initBaseLayer(map: LMap): void {
  // Keep lastStableZoom in sync with the map so the center watcher always
  // uses the zoom from the last *completed* animation, never a mid-flyTo value.
  map.on('zoomend', () => {
    if (map) lastStableZoom = map.getZoom()
  })

  map.on('moveend', emitBounds)

  if (!webGLSupported()) {
    initRasterFallback(map)
    return
  }

  try {
    const maptilerLayer = new MaptilerLayer({
      apiKey: __APP_CONFIG__.MAPTILER_API_KEY,
      style: MapStyle.BASIC,
    }).addTo(map)

    maptilerLayer.getMaptilerSDKMap().once('idle', () => {
      emit('map:ready', map)
    })
  } catch (err) {
    console.error('[OsmPoiMap] WebGL init failed, falling back to raster:', err)
    initRasterFallback(map)
  }
}

// --- clusters + spider hover region ----------------------------------------

function initClusters(map: LMap) {
  clusterGroup = (L as any).markerClusterGroup({
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 40,
    spiderfyDistanceMultiplier: 1.5,
    iconCreateFunction: customClusterIcon,
  })

  clusterGroup.on('clustermouseover', onClusterMouseOver)
  clusterGroup.on('spiderfied', onClusterSpiderfied)
  clusterGroup.on('unspiderfied', onClusterUnspiderfied)

  map.on('mousemove', onMapMouseMove)
  map.on('zoomstart movestart', closeSpider)

  map.addLayer(clusterGroup)
}

function onClusterMouseOver(e: any) {
  // If another cluster is open, close it first (prevents multiple open states)
  if (activeSpiderCluster && activeSpiderCluster !== e.layer) closeSpider()

  // scale spiderfy distance with viewport
  clusterGroup.options.spiderfyDistanceMultiplier = computeViewportMultiplier(map!)

  e.layer.spiderfy()
}

function onClusterSpiderfied(e: any) {
  activeSpiderCluster = e.cluster
  activeSpiderHoverBounds = computeSpiderHoverBounds(
    map!,
    activeSpiderCluster,
    SPIDER_HOVER_PADDING_PX
  )
}

function onClusterUnspiderfied() {
  activeSpiderCluster = null
  activeSpiderHoverBounds = null
}

function onMapMouseMove(ev: L.LeafletMouseEvent) {
  if (!activeSpiderCluster || !activeSpiderHoverBounds) return
  if (!activeSpiderHoverBounds.contains(ev.latlng)) closeSpider()
}

const popupTarget = ref<HTMLElement | null>(null)
const popupItem = ref<T | null>(null)

function updateMarkers() {
  if (!map || !clusterGroup) return
  clusterGroup.clearLayers()
  markers.clear()
  itemsById.clear()

  for (const item of props.items) {
    const location = props.getLocation(item)
    if (!location || !(location.lat && location.lon)) continue

    const isSelected = item.id === props.selectedId
    const m = L.marker([location.lat, location.lon], {
      title: props.getTitle(item),
      icon: iconForItem(item, isSelected),
      keyboard: true,
    })

    const highlighted = props.isHighlighted?.(item) ?? false
    m.bindPopup('', {
      maxWidth: 420,
      autoPan: true,
      autoPanPadding: L.point(20, 20),
      className: highlighted ? 'item-popup item-popup-highlighted' : 'item-popup',
    })

    m.on('popupopen', (e: L.PopupEvent) => {
      const target = e.popup
        .getElement()
        ?.querySelector('.leaflet-popup-content') as HTMLElement | null
      popupTarget.value = target
      popupItem.value = item
      // After Vue renders the teleported popup content, re-measure so
      // Leaflet's autoPan accounts for the actual popup dimensions.
      nextTick(() => e.popup.update())
    })
    m.on('popupclose', () => {
      popupTarget.value = null
      popupItem.value = null
    })

    m.on('click', () => m.openPopup())

    clusterGroup.addLayer(m)
    markers.set(item.id, m)
    itemsById.set(item.id, item)
  }

  // Fit bounds to markers when explicitly requested or when no center was provided
  if ((props.fitToPois || !props.center) && props.items.length > 0) {
    const latlngs: [number, number][] = []
    for (const item of props.items) {
      const location = props.getLocation(item)
      if (location?.lat && location?.lon) {
        latlngs.push([location.lat, location.lon])
      }
    }
    if (latlngs.length > 0) {
      const bounds = L.latLngBounds(latlngs)
      map.fitBounds(bounds, { padding: [24, 24] })
    }
  }
}

function highlightSelected() {
  if (!map) return
  for (const [id, marker] of markers) {
    const item = itemsById.get(id)
    if (!item) continue
    marker.setIcon(iconForItem(item, id === props.selectedId))
  }
  if (props.selectedId != null) {
    const m = markers.get(props.selectedId)
    if (m) {
      // Center and open its popup
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 12))
      m.openPopup()
    }
  }
}

onMounted(() => {
  ensureMap()
})

function destroyMap() {
  if (!map) return
  map.off('moveend', emitBounds)
  map.off('mousemove', onMapMouseMove)
  map.off('zoomstart movestart', closeSpider)

  clusterGroup?.off('clustermouseover', onClusterMouseOver)
  clusterGroup?.off('spiderfied', onClusterSpiderfied)
  clusterGroup?.off('unspiderfied', onClusterUnspiderfied)

  map.remove()
  map = null
  clusterGroup = null
}

onBeforeUnmount(() => {
  destroyMap()
})

watch(
  () => props.items,
  () => {
    updateMarkers()
  },
  { deep: true }
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
    if (map && newCenter) {
      map.flyTo(newCenter, lastStableZoom, { duration: 1 })
    }
  }
)
</script>

<template>
  <div>
    <div
      class="osm-poi-map"
      ref="mapEl"
    />

    <Teleport
      v-if="popupTarget && popupItem"
      :to="popupTarget"
    >
      <component
        :is="popupComponent"
        :item="popupItem"
        @click="$emit('item:select', popupItem.id)"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.osm-poi-map {
  /* Set an explicit height, or it won't be visible */
  height: 100%;
  width: 100%;
}

/* Simple circular dot markers */
:deep(.poi-dot) {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  outline: 2px solid rgba(0, 0, 0, 0.25);
  background: #3a86ff; /* default */
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
}

:deep(.poi-dot.selected) {
  width: 16px;
  height: 16px;
  background: #ff006e;
}

:deep(.poi-dot.highlighted) {
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.9),
    0 0 10px 3px rgba(217, 83, 79, 0.4);
  filter: drop-shadow(0 0 6px rgba(217, 83, 79, 0.5));
}

/* Cluster badge */
:deep(.poi-cluster-icon) {
  background: transparent;
  border: none;
}

:deep(.poi-cluster-badge) {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #3a86ff;
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* Hide default markercluster styles we don't use */
:deep(.marker-cluster) {
  background: transparent !important;
  border: none !important;
}

:deep(.marker-cluster div) {
  background: transparent !important;
}

/* Remove default Leaflet icon images spacing */
:deep(.leaflet-div-icon) {
  background: transparent;
  border: none;
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

:deep(.leaflet-popup-content) {
  margin: 0;
  line-height: 1.3;
  min-height: 1px;
}
</style>
