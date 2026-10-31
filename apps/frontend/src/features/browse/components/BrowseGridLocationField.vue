<script setup lang="ts">
import { computed, inject, ref, useId, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'

import type { OwnerProfile } from '@zod/profile/profile.dto'
import type { LocationDTO } from '@zod/dto/location.dto'
import { useGeocoder, type GeocodingResult } from '@/features/geocoding/composables/useGeocoder'
import LocationLabel from '@/features/shared/profiledisplay/LocationLabel.vue'

/**
 * The grid's location field. Shows the name of the current map area; typing
 * searches places, and picking one emits `place:select` so the map can fit it.
 */
const props = defineProps<{ areaName: string | null }>()

const emit = defineEmits<{ 'place:select': [place: GeocodingResult] }>()

const { t, locale } = useI18n()
const geocoder = useGeocoder()
const { results } = geocoder

const viewerProfile = inject<Ref<OwnerProfile | null> | null>('viewerProfile', null)
const viewerLocation = computed(() => viewerProfile?.value?.location)

const listId = useId()
const inputEl = ref<HTMLInputElement | null>(null)
const isEditing = ref(false)
const query = ref('')

const displayValue = computed(() => (isEditing.value ? query.value : (props.areaName ?? '')))

const suggestions = computed(() => (isEditing.value ? results.value : []))

const runSearch = useDebounceFn((q: string) => {
  geocoder.search(q.trim(), locale.value, viewerLocation.value)
}, 300)

function onFocus() {
  isEditing.value = true
  query.value = ''
}

function onInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  runSearch(query.value)
}

function stopEditing() {
  isEditing.value = false
  query.value = ''
  geocoder.clear()
}

function onBlur() {
  // Let a click on a suggestion land before the list disappears.
  setTimeout(stopEditing, 150)
}

function onEscape() {
  stopEditing()
  inputEl.value?.blur()
}

function select(place: GeocodingResult) {
  emit('place:select', place)
  stopEditing()
  inputEl.value?.blur()
}

function asLocation(place: GeocodingResult): LocationDTO {
  return { country: place.country, cityName: place.name, lat: place.lat, lon: place.lon }
}
</script>

<template>
  <div class="browse-grid-location position-relative flex-grow-1 min-w-0">
    <input
      ref="inputEl"
      type="search"
      class="form-control form-control-sm"
      autocomplete="off"
      :value="displayValue"
      :placeholder="t('profiles.browse.grid.location_placeholder')"
      :aria-label="t('profiles.browse.grid.location_label')"
      :aria-expanded="suggestions.length > 0"
      :aria-controls="listId"
      role="combobox"
      @focus="onFocus"
      @input="onInput"
      @blur="onBlur"
      @keydown.esc.prevent="onEscape"
    />
    <BListGroup
      v-if="suggestions.length > 0"
      :id="listId"
      class="suggestions position-absolute start-0 end-0 shadow"
      role="listbox"
    >
      <BListGroupItem
        v-for="(place, i) in suggestions"
        :key="`${place.country}-${place.name}-${i}`"
        class="small px-2 py-1"
        button
        role="option"
        @mousedown.prevent
        @click="select(place)"
      >
        <LocationLabel
          :viewer-location="viewerLocation"
          :location="asLocation(place)"
          :show-only-foreign-country="true"
          :show-country-icon="false"
        />
      </BListGroupItem>
    </BListGroup>
  </div>
</template>

<style scoped lang="scss">
.min-w-0 {
  min-width: 0;
}
.suggestions {
  top: calc(100% + 0.25rem);
  z-index: 5;
}
</style>
