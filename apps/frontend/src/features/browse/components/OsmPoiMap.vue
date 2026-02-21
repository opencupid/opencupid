<script setup lang="ts">
import ProfileCardComponent from './ProfileCardComponent.vue'
import { type PublicProfile } from '@zod/profile/profile.dto'

import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'
import L, { type DivIcon, Map as LMap, Marker as LMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af" width="18" height="18"><path d="M12 12c2.67 0 4.8-2.13 4.8-4.8S14.67 2.4 12 2.4 7.2 4.53 7.2 7.2 9.33 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8V21.6h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`

function getProfileIcon(profile: PublicProfile, isSelected: boolean): DivIcon {
  const thumbUrl = profile.profileImages?.[0]?.variants?.find((v) => v.size === 'thumb')?.url
  const size = isSelected ? 36 : 32
  const inner = thumbUrl
    ? `<img src="${thumbUrl.replace(/"/g, '%22')}" />`
    : DEFAULT_AVATAR_SVG
  return L.divIcon({
    className: '',
    html: `<div class="avatar-marker${isSelected ? ' selected' : ''}" style="width:${size}px;height:${size}px">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

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
let markers = new Map<string | number, LMarker>()
let profilesById = new Map<string | number, PublicProfile>()
const markersLayer = L.layerGroup()

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
  profilesById.clear()

  for (const profile of props.profiles) {
    if (!(profile.location.lat && profile.location.lon)) continue
    profilesById.set(profile.id, profile)
    const m = L.marker([profile.location.lat, profile.location.lon], {
      title: profile.publicName,
      icon: getProfileIcon(profile, profile.id === props.selectedId),
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
    const latlngs = props.profiles.map((p) => [p.location.lat, p.location.lon]) as [
      number,
      number,
    ][]
    const bounds = L.latLngBounds(latlngs)
    map.fitBounds(bounds, { padding: [24, 24] })
  }
}

function highlightSelected() {
  if (!map) return
  for (const [id, marker] of markers) {
    const profile = profilesById.get(id)
    if (profile) {
      marker.setIcon(getProfileIcon(profile, id === props.selectedId))
    }
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
    <div
      class="osm-poi-map"
      ref="mapEl"
    />

    <Teleport
      v-if="popupTarget"
      :to="popupTarget"
    >
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

/* Circular avatar marker */
:deep(.avatar-marker) {
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  background: #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.avatar-marker.selected) {
  border-color: #ff006e;
  box-shadow: 0 0 0 2px #ff006e, 0 2px 6px rgba(0, 0, 0, 0.4);
}

:deep(.avatar-marker img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
