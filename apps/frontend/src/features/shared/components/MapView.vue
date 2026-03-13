<script setup lang="ts">
import { ref, type Component } from 'vue'
import type { Map as LMap } from 'leaflet'

import OsmPoiMap from './OsmPoiMap.vue'
import type { MapPoi, MapBounds } from './OsmPoiMap.types'
import MapPlaceholder from './MapPlaceholder.vue'

const props = withDefaults(
  defineProps<{
    items: MapPoi[]
    iconComponent: Component
    popupComponent?: Component
    center?: [number, number]
    zoom?: number
    selectedId?: string | number
    fitToPois?: boolean
    isLoading?: boolean
    isPlaceholderAnimated?: boolean
  }>(),
  {
    isLoading: false,
    isPlaceholderAnimated: true,
  }
)

const emit = defineEmits<{
  (e: 'item:select', id: string | number): void
  (e: 'map:ready', map: LMap): void
  (e: 'bounds-changed', bounds: MapBounds): void
}>()

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
        :items="props.items"
        :center="props.center"
        :zoom="props.zoom"
        :selected-id="props.selectedId"
        :fit-to-pois="props.fitToPois"
        :icon-component="props.iconComponent"
        :popup-component="props.popupComponent"
        class="h-100"
        @map:ready="onMapReady"
        @item:select="(id) => emit('item:select', id)"
        @bounds-changed="(bounds) => emit('bounds-changed', bounds)"
      />
    </div>
  </div>
</template>
