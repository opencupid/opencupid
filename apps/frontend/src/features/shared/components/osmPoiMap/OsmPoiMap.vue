<script setup lang="ts">
import { ref } from 'vue'
import type { Component } from 'vue'
import type { Map as LMap } from 'leaflet'

import type { MapPoi, MapCluster, BoundsWithZoom } from './OsmPoiMap.types'
import { useMapController } from './useMapController'
import MapPlaceholder from '@/features/shared/components/MapPlaceholder.vue'

const props = withDefaults(
  defineProps<{
    items: MapPoi[]
    clusters?: MapCluster[]
    iconResolver: (poi: MapPoi) => Component
    popupResolver?: (poi: MapPoi) => Component
    center?: [number, number]
    zoom?: number
    fitToPois?: boolean
    boundsDebounce?: number
    fetchPopupData?: (id: string | number) => Promise<unknown>
  }>(),
  {
    zoom: 7,
    fitToPois: false,
    boundsDebounce: 500,
    clusters: () => [],
  }
)

const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds:changed', payload: BoundsWithZoom): void
}>()

const mapEl = ref<HTMLDivElement | null>(null)

const { flyToMarker, isMapReady, popupItem, popupTarget } = useMapController(mapEl, props, emit)

defineExpose({ flyToMarker })
</script>

<template>
  <div class="osm-poi-map-wrapper">
    <MapPlaceholder
      v-show="!isMapReady"
      class="position-absolute top-0 start-0 w-100 h-100 opacity-25"
    />
    <div
      ref="mapEl"
      class="osm-poi-map"
      :class="{ 'opacity-50': !isMapReady }"
    />

    <Teleport
      v-if="popupResolver && popupTarget && popupItem"
      :to="popupTarget"
    >
      <component
        :is="popupResolver(popupItem)"
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
  height: 100%;
  width: 100%;
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

:deep(.poi-cluster-icon) {
  z-index: 5000; /* above regular markers but below hovered avatar icons */
}

/* Avatar marker hover feedback */
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
