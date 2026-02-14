<script setup lang="ts" generic="T extends MapItem">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import type { Ref, Component } from 'vue'
import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** Generic map item with required geo properties */
export interface MapItem {
  id: string | number
  lat: number | null | undefined
  lon: number | null | undefined
}

const props = withDefaults(
  defineProps<{
    items: T[]
    /** Optional starting center/zoom (used if we can't fit to bounds) */
    center?: [number, number]
    zoom?: number
    /** ID of selected item to highlight */
    selectedId?: string | number
    /** Whether to auto-fit the map to show all items */
    fitToItems?: boolean
    /** Vue component to render in popup */
    popupComponent?: Component
  }>(),
  {
    center: () => [47.0, 19.0], // Central Europe-ish default
    zoom: 7,
    fitToItems: false,
  }
)

const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map-ready', map: LMap): void
}>()

const mapEl: Ref<HTMLDivElement | null> = ref(null)
let map: LMap | null = null
let markers = new Map<string | number, LMarker>()
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
    // Improve tile loading reliability - use a plain gray tile as fallback
    errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OTk5OSI+VGlsZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+',
    // Keep old tiles while loading new ones
    keepBuffer: 2,
    // More aggressive prefetching to reduce missing tiles
    updateWhenZooming: false,
    // Increase the number of tiles to load around the visible area
    updateWhenIdle: true
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

  for (const item of props.items) {
    if (!(item.lat && item.lon)) continue
    const m = L.marker([item.lat, item.lon], {
      icon: item.id === props.selectedId ? selectedIcon : defaultIcon,
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
  }

  // Fit bounds if requested and we have at least one item
  if (props.fitToItems && props.items.length > 0) {
    const latlngs = props.items
      .filter(item => item.lat && item.lon)
      .map(item => [item.lat!, item.lon!]) as [number, number][]
    if (latlngs.length > 0) {
      const bounds = L.latLngBounds(latlngs)
      map.fitBounds(bounds, { padding: [24, 24] })
    }
  }
}

function highlightSelected() {
  if (!map) return
  for (const [id, marker] of markers) {
    marker.setIcon(id === props.selectedId ? selectedIcon : defaultIcon)
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
    <div class="osm-poi-map" ref="mapEl" />

    <Teleport v-if="popupTarget && popupItem && popupComponent" :to="popupTarget">
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
