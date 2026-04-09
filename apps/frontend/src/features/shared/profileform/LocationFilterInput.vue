<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import LocationSelector from './LocationSelector.vue'
import IconHome from '@/assets/icons/interface/home.svg'

import { toGeoPoint, type GeoPoint, type LocationDTO } from '@zod/dto/location.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'

const model = defineModel<LocationDTO>({ required: true })

const props = defineProps<{
  viewerProfile: OwnerProfile | null
}>()

const emit = defineEmits<{
  /**
   * Emitted when the user picks a location with usable coordinates,
   * either via the selector or the "use my profile location" shortcut.
   * Consumers should treat this as a one-shot "pan the map here"
   * command. Locations without lat/lon are filtered out here so the
   * payload is always a fully-populated `GeoPoint`.
   */
  'location:set': [point: GeoPoint]
}>()

const { t } = useI18n()

function setLocationFromProfile() {
  const loc = props.viewerProfile?.location
  if (!loc) return
  Object.assign(model.value, loc)
  const point = toGeoPoint(loc)
  if (point) emit('location:set', point)
}

function onSelectorSelected(loc: LocationDTO) {
  const point = toGeoPoint(loc)
  if (point) emit('location:set', point)
}
</script>

<template>
  <div class="d-flex align-items-center gap-2">
    <BButton
      variant="link-secondary"
      size="sm"
      class="ms-1 p-0"
      :title="t('profiles.browse.filters.locate_button_title')"
      @click="setLocationFromProfile"
    >
      <IconHome class="svg-icon-lg" />
    </BButton>
    <div class="flex-grow-1">
      <LocationSelector
        v-model="model"
        open-direction="bottom"
        :allow-empty="true"
        :close-on-select="true"
        @selected="onSelectorSelected"
      />
    </div>
  </div>
</template>
