<script setup lang="ts" generic="T extends { id: string | number }">
import { onMounted, onBeforeUnmount, ref, watch, type Component } from 'vue'
import type { Ref } from 'vue'
import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
  }>(),
  {
    center: () => [47.0, 19.0], // Central Europe-ish default
    zoom: 7,
    fitToPois: false,
  }
)

const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map-ready', map: LMap): void
}>()

const mapEl: Ref<HTMLDivElement | null> = ref(null)
let map: LMap | null = null
let markers = new Map<string | number, LMarker>()
let itemsById = new Map<string | number, T>()
const markersLayer = L.layerGroup()

// Simple highlighted marker icon (selected)
const selectedIcon = L.divIcon({
  className: 'poi-selected-icon',
  html: `<div class="poi-dot selected"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const defaultIcon = L.divIcon({
  className: 'poi-default-icon',
  html: `<div class="poi-dot"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function avatarIcon(url: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 40 : 32
  return L.divIcon({
    className: 'poi-avatar-icon',
    html: `<img src="${encodeURI(url)}" class="poi-avatar${isSelected ? ' selected' : ''}" />`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function iconForItem(item: T, isSelected: boolean): L.DivIcon {
  const imageUrl = props.getImageUrl?.(item)
  if (imageUrl) return avatarIcon(imageUrl, isSelected)
  return isSelected ? selectedIcon : defaultIcon
}

function ensureMap() {
  if (map || !mapEl.value) return
  map = L.map(mapEl.value, {
    center: props.center,
    zoom: props.zoom,
    preferCanvas: true,
  })

  // OSM tiles + required attribution
  const tilesUrl = `${__APP_CONFIG__.API_BASE_URL}/tiles/{z}/{x}/{y}.png`

  const tileLayer = L.tileLayer(tilesUrl, {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    // Use a plain gray tile as fallback (no text) - base64 encoded blank gray SVG
    errorTileUrl:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y1ZjVmNSIvPjwvc3ZnPg==',
    // Reduce tile buffer to prevent excessive tile requests
    keepBuffer: 1,
    // Enable tile loading during zoom (default: true) - prevents overwhelming tile server
    // Setting this to false causes all tiles to be requested at once during zoom
    updateWhenZooming: true,
    // Update tiles when map stops moving (default: true)
    updateWhenIdle: true,
    // Limit tile update frequency to prevent request flooding (default: 200ms)
    updateInterval: 200,
  }).addTo(map)

  // Add error handling for tile loading
  tileLayer.on('tileerror', (error: any) => {
    console.warn('Tile loading error:', error)
  })

  // Add loading event handlers to monitor tile loading
  let tilesLoading = 0
  tileLayer.on('tileloadstart', () => {
    tilesLoading++
  })

  tileLayer.on('tileload', () => {
    tilesLoading--
  })

  tileLayer.on('tileerror', () => {
    tilesLoading--
  })

  markersLayer.addTo(map)
  emit('map-ready', map)
}

const popupTarget = ref<HTMLElement | null>(null)
const popupItem = ref<T | null>(null)

function updateMarkers() {
  if (!map) return
  markersLayer.clearLayers()
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

    m.bindPopup('', { maxWidth: 420, autoPan: true, className: 'item-popup' })

    m.on('popupopen', (e: L.PopupEvent) => {
      // Leaflet builds: <div class="leaflet-popup-content">…</div>
      const target = e.popup
        .getElement()
        ?.querySelector('.leaflet-popup-content') as HTMLElement | null
      popupTarget.value = target
      popupItem.value = item
    })
    m.on('popupclose', () => {
      popupTarget.value = null
      popupItem.value = null
    })

    m.on('click', () => m.openPopup())

    m.addTo(markersLayer)
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

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

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
:deep(.osm-poi-map) {
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

/* Avatar thumbnail markers */
:deep(.poi-avatar-icon) {
  background: transparent;
  border: none;
}

:deep(.poi-avatar) {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

:deep(.poi-avatar.selected) {
  width: 40px;
  height: 40px;
  border-color: #ff006e;
  box-shadow:
    0 0 0 2px #ff006e,
    0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Remove default Leaflet icon images spacing */
:deep(.leaflet-div-icon) {
  background: transparent;
  border: none;
}

:deep(.leaflet-popup) {
  width: 15rem !important;
}

:deep(.leaflet-popup-content) {
  margin: 0;
  line-height: 1.3;
  font-size: 1.08333em;
  min-height: 1px;
}
</style>
