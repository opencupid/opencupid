<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import LocationSelector from './LocationSelector.vue'
import IconHome from '@/assets/icons/interface/home.svg'

import type { LocationDTO } from '@zod/dto/location.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'

const model = defineModel<LocationDTO>({ required: true })

const props = defineProps<{
  viewerProfile: OwnerProfile | null
}>()

const emit = defineEmits<{
  'location:set-from-profile': []
  /**
   * Emitted when the user picks a location with usable coordinates.
   * Consumers should treat this as a one-shot "pan the map here" command;
   * it is no longer tied to any persistent filter state.
   */
  'location:fly-to': [coords: { lat: number; lon: number }]
}>()

const { t } = useI18n()

function setLocationFromProfile() {
  if (props.viewerProfile?.location) {
    Object.assign(model.value, props.viewerProfile.location)
    emit('location:set-from-profile')
    const { lat, lon } = props.viewerProfile.location
    if (lat != null && lon != null) {
      emit('location:fly-to', { lat, lon })
    }
  }
}

function onSelectorSelected(loc: LocationDTO) {
  if (loc.lat != null && loc.lon != null) {
    emit('location:fly-to', { lat: loc.lat, lon: loc.lon })
  }
}
</script>

<template>
  <div class="d-flex align-items-center gap-2">
    <BButton
      variant="link-secondary"
      size="sm"
      class="p-0"
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
