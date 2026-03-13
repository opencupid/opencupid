<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import LocationSelector from './LocationSelector.vue'
import IconTarget2 from '@/assets/icons/interface/target-2.svg'

import type { LocationDTO } from '@zod/dto/location.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'

const model = defineModel<LocationDTO>({ required: true })

const props = defineProps<{
  viewerProfile: OwnerProfile | null
}>()

const emit = defineEmits<{
  'location:set-from-profile': []
}>()

const { t } = useI18n()

function setLocationFromProfile() {
  if (props.viewerProfile?.location) {
    Object.assign(model.value, props.viewerProfile.location)
    emit('location:set-from-profile')
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
      <IconTarget2 class="svg-icon-lg" />
    </BButton>
    <div class="flex-grow-1">
      <LocationSelector
        v-model="model"
        open-direction="bottom"
        :allow-empty="true"
        :close-on-select="true"
      />
    </div>
  </div>
</template>
