<script setup lang="ts">
import { ref, type Component } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { Map as LMap } from 'leaflet'

import OsmPoiMap from './osmPoiMap/OsmPoiMap.vue'
import type { MapPoi, MapCluster, BoundsWithZoom } from './osmPoiMap/OsmPoiMap.types'
import MapPlaceholder from './MapPlaceholder.vue'

const BOUNDS_DEBOUNCE_MS = 500

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
    isLoading?: boolean
    isPlaceholderAnimated?: boolean
    fetchPopupData?: (id: string | number) => Promise<unknown>
  }>(),
  {
    isLoading: false,
    isPlaceholderAnimated: true,
    clusters: () => [],
  }
)

const osmPoiMapRef = ref<InstanceType<typeof OsmPoiMap> | null>(null)

function flyToMarker(poi: MapPoi) {
  osmPoiMapRef.value?.flyToMarker(poi)
}

defineExpose({ flyToMarker })

const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds-changed', payload: BoundsWithZoom): void
}>()

const debouncedEmitBounds = useDebounceFn((payload: BoundsWithZoom) => {
  emit('bounds-changed', payload)
}, BOUNDS_DEBOUNCE_MS)

const isMapReady = ref(false)

function onMapReady(map: LMap) {
  isMapReady.value = true
  emit('map:ready', map)
}
</script>

<template>
  <div class="position-relative h-100">
    <MapPlaceholder
      :isAnimated="isPlaceholderAnimated"
      v-show="!isMapReady"
      class="position-absolute top-0 start-0 w-100 h-100 opacity-25"
    />

    <div
      class="map-view h-100"
      :class="{
        'opacity-50': !isMapReady,
      }"
    >
      <OsmPoiMap
        ref="osmPoiMapRef"
        :items="props.items"
        :clusters="props.clusters"
        :center="props.center"
        :zoom="props.zoom"
        :selected-id="props.selectedId"
        :highlighted-poi-id="props.highlightedPoiId"
        :fit-to-pois="props.fitToPois"
        :icon-component="props.iconComponent"
        :icon-resolver="props.iconResolver"
        :popup-component="props.popupComponent"
        :fetch-popup-data="props.fetchPopupData"
        class="h-100"
        @map:ready="onMapReady"
        @item:select="(id) => emit('item:select', id)"
        @bounds-changed="debouncedEmitBounds"
      />
    </div>
  </div>
</template>
