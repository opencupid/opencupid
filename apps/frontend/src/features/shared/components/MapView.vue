<script setup lang="ts" generic="T extends { id: string | number }">
import { ref, type Component } from 'vue'
import type { Map as LMap } from 'leaflet'

import OsmPoiMap from './OsmPoiMap.vue'
import MapPlaceholder from './MapPlaceholder.vue'
import type { AvatarImage } from './AvatarIcon.vue'

const props = withDefaults(
  defineProps<{
    items: T[]
    center?: [number, number]
    zoom?: number
    selectedId?: string | number
    fitToPois?: boolean
    popupComponent: Component
    getLocation: (item: T) => { lat?: number | null; lon?: number | null } | null | undefined
    getTitle: (item: T) => string
    getImage?: (item: T) => AvatarImage | undefined
    isHighlighted?: (item: T) => boolean
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
        'opacity-0': !isMapReady,
        'opacity-75': isMapReady && isLoading,
      }"
    >
      <OsmPoiMap
        :items="props.items"
        :center="props.center"
        :zoom="props.zoom"
        :selected-id="props.selectedId"
        :fit-to-pois="props.fitToPois"
        :popup-component="props.popupComponent"
        :get-location="props.getLocation"
        :get-title="props.getTitle"
        :get-image="props.getImage"
        :is-highlighted="props.isHighlighted"
        class="h-100"
        @map:ready="onMapReady"
        @item:select="(id) => emit('item:select', id)"
      />
    </div>
  </div>
</template>
