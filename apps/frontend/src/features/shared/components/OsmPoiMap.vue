<script setup lang="ts" generic="T extends { id: string | number }">
import { onMounted, ref, watch, nextTick, type Component, render, h } from 'vue'
import type { Ref } from 'vue'
import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { MaptilerLayer } from '@maptiler/leaflet-maptilersdk'
import { MapStyle } from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'

import AvatarIcon from './AvatarIcon.vue'

/** Basic POI shape for location data extraction */
export interface PoiItem {
  id: string | number
  location?: {
    lat?: number | null
    lon?: number | null
  }
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
    /** Optional function to get a thumbnail image URL for an item */
    getImageUrl?: (item: T) => string | undefined
    /** ID of selected item to highlight */
    selectedId?: string | number
    /** Whether to auto-fit the map to show all items */
    fitToPois?: boolean
    /** Optional callback to determine if an item should have a highlight halo */
    isHighlighted?: (item: T) => boolean
  }>(),
  {
    center: () => [47.0, 19.0], // Central Europe-ish default
    zoom: 7,
    fitToPois: false,
  }
)

const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
}>()

const mapEl: Ref<HTMLDivElement | null> = ref(null)
let map: LMap | null = null
let markers = new Map<string | number, LMarker>()
let itemsById = new Map<string | number, T>()

function customClusterIcon(cluster: any): L.DivIcon {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `<div class="poi-cluster-badge">${count}</div>`,
    className: 'poi-cluster-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

let clusterGroup: any = null
let spiderfiedCluster: any = null
let spiderfiedMarkers: any[] = []
let spiderfiedMarkerHandlers: Array<{ marker: any; handler: (me: any) => void }> = []

function isPartOfSpiderfiedCluster(element: Element | null): boolean {
  if (!element) return false
  const clusterEl = spiderfiedCluster?.getElement?.()
  if (clusterEl && (clusterEl === element || clusterEl.contains(element))) return true
  return spiderfiedMarkers.some((m: any) => {
    const el = m.getElement?.()
    return el && (el === element || el.contains(element))
  })
}
function avatarIcon(url: string, isSelected: boolean, isHighlighted: boolean): L.DivIcon {
  const size = 50

  const container = document.createElement('span')
  render(h(AvatarIcon, { url: encodeURI(url), isHighlighted, isSelected }), container)
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
  const imageUrl = props.getImageUrl?.(item)
  if (imageUrl) return avatarIcon(imageUrl, isSelected, highlighted)
  return dotIcon(isSelected, highlighted)
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
  L.tileLayer(
    `https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=${__APP_CONFIG__.MAPTILER_API_KEY}`,
    { maxZoom: 19, attribution: '© MapTiler © OpenStreetMap contributors' }
  ).addTo(map)
}

function ensureMap() {
  if (map || !mapEl.value) return
  map = L.map(mapEl.value, {
    center: props.center,
    zoom: props.zoom,
    maxZoom: 19,
    preferCanvas: true,
  })

  if (!webGLSupported()) {
    initRasterFallback(map)
    emit('map:ready', map)
  } else {
    try {
      const maptilerLayer = new MaptilerLayer({
        apiKey: __APP_CONFIG__.MAPTILER_API_KEY,
        style: MapStyle.BASIC,
      }).addTo(map)
      // Fire map:ready only after the underlying MapLibre map is idle —
      // meaning all tiles in the viewport have fully loaded and rendered.
      maptilerLayer.getMaptilerSDKMap().once('idle', () => emit('map:ready', map!))
    } catch (err) {
      console.error(
        '[OsmPoiMap] WebGL map initialization failed, falling back to raster tiles:',
        err
      )
      initRasterFallback(map)
      emit('map:ready', map)
    }
  }

  clusterGroup = (L as any).markerClusterGroup({
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 40,
    spiderfyDistanceMultiplier: 1.5,
    iconCreateFunction: customClusterIcon,
  })

  clusterGroup.on('clustermouseover', (e: any) => {
    e.layer.spiderfy()
  })
  clusterGroup.on('clustermouseout', (e: any) => {
    const relatedTarget = e.originalEvent?.relatedTarget as Element | null
    if (!isPartOfSpiderfiedCluster(relatedTarget)) {
      e.layer.unspiderfy()
    }
  })
  clusterGroup.on('spiderfied', (e: any) => {
    spiderfiedCluster = e.cluster
    spiderfiedMarkers = e.markers || []
    spiderfiedMarkerHandlers = []
    for (const marker of spiderfiedMarkers) {
      const handler = (e: any) => {
        const relatedTarget = e.originalEvent?.relatedTarget as Element | null
        if (!isPartOfSpiderfiedCluster(relatedTarget)) {
          spiderfiedCluster?.unspiderfy()
        }
      }
      marker.on('mouseout', handler)
      spiderfiedMarkerHandlers.push({ marker, handler })
    }
  })
  clusterGroup.on('unspiderfied', () => {
    for (const { marker, handler } of spiderfiedMarkerHandlers) {
      marker.off('mouseout', handler)
    }
    spiderfiedMarkerHandlers = []
    spiderfiedCluster = null
    spiderfiedMarkers = []
  })

  map.addLayer(clusterGroup)
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

  // Fit bounds if requested and we have at least one item with location
  if (props.fitToPois && props.items.length > 0) {
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
  updateMarkers()
  highlightSelected()
})

// onBeforeUnmount(() => {
//   if (map) {
//     map.remove()
//     map = null
//   }
// })

watch(
  () => props.items,
  () => {
    updateMarkers()
    highlightSelected()
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
      map.flyTo(newCenter, map.getZoom(), { duration: 1 })
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
