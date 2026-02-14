<script setup lang="ts">
import ProfileCardComponent from './ProfileCardComponent.vue'
import { type PublicProfile } from '@zod/profile/profile.dto'

import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'
import L, { Map as LMap, Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** Basic POI shape; extend as needed */
export interface Poi {
  id: string | number
  name: string
  lat: number
  lng: number
  /** Optional fields */
  description?: string
  category?: string
}

const props = withDefaults(
  defineProps<{
    profiles: PublicProfile[]
    // pois: Poi[]
    /** Optional starting center/zoom (used if we can't fit to bounds) */
    center?: [number, number]
    zoom?: number
    /** ID of selected POI to highlight */
    selectedId?: string | number
    /** Whether to auto-fit the map to show all POIs */
    fitToPois?: boolean
  }>(),
  {
    center: () => [47.0, 19.0], // Central Europe-ish default
    zoom: 7,
    fitToPois: false,
  }
)

const emit = defineEmits<{
  (e: 'profile:select', id: string): void
  (e: 'map-ready', map: LMap): void
}>()

const mapEl: Ref<HTMLDivElement | null> = ref(null)
let map: LMap | null = null
let markers = new Map<Poi['id'], LMarker>()
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
    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    // Use a plain gray tile as fallback (no text) - base64 encoded blank gray SVG
    errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y1ZjVmNSIvPjwvc3ZnPg==',
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
    // Could emit an event to notify parent component of tile loading issues
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
const popupProfile = ref<PublicProfile | null>(null)

function updateMarkers() {
  if (!map) return
  markersLayer.clearLayers()
  markers.clear()

  for (const profile of props.profiles) {
    if (!(profile.location.lat && profile.location.lon)) continue
    const m = L.marker([profile.location.lat, profile.location.lon], {
      title: profile.publicName,
      icon: profile.id === props.selectedId ? selectedIcon : defaultIcon,
      keyboard: true,
    })
    // const popupHtml =
    //   `<strong>${escapeHtml(profile.publicName)}</strong>` +
    //   (profile.introSocial ? `<br>${escapeHtml(profile.introSocial)}` : '')
    // m.bindPopup(popupHtml)
    m.bindPopup('', { maxWidth: 420, autoPan: true, className: 'profile-popup' })

    // m.on('click', () => {
    //   emit('profile:select', profile.id)
    // })

    m.on('popupopen', (e: L.PopupEvent) => {
      // Leaflet builds: <div class="leaflet-popup-content">…</div>
      const target = e.popup
        .getElement()
        ?.querySelector('.leaflet-popup-content') as HTMLElement | null
      popupTarget.value = target
      popupProfile.value = profile
    })
    m.on('popupclose', () => {
      popupTarget.value = null
      popupProfile.value = null
    })

    m.on('click', () => m.openPopup())

    m.addTo(markersLayer)
    // console.log('Added marker for profile', m)
    markers.set(profile.id, m)
  }

  // Fit bounds if requested and we have at least one POI
  if (props.fitToPois && props.profiles.length > 0) {
    const latlngs = props.profiles.map(p => [p.location.lat, p.location.lon]) as [number, number][]
    const bounds = L.latLngBounds(latlngs)
    map.fitBounds(bounds, { padding: [24, 24] })
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

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
  () => props.profiles,
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

    <Teleport v-if="popupTarget" :to="popupTarget">
      <ProfileCardComponent
        v-if="popupProfile"
        :profile="popupProfile"
        :showTags="true"
        :showLocation="true"
        @click="$emit('profile:select', popupProfile.id)"
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
  font-size: 13px;
  font-size: 1.08333em;
  min-height: 1px;
}
</style>
