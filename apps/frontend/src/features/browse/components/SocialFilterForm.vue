<script setup lang="ts">
import { ref } from 'vue'

import TagSelectComponent from '@/features/shared/profileform/TagSelectComponent.vue'
import CountrySelector from '@/features/shared/profileform/CountrySelector.vue'
import CitySelector from '@/features/shared/profileform/CitySelector.vue'
import IconTarget2 from '@/assets/icons/interface/target-2.svg'

import type { OwnerProfile } from '@zod/profile/profile.dto'
import { type SocialMatchFilterDTO, SocialMatchFilterDTOSchema } from '@zod/match/filters.dto'
import { type LocationDTO } from '@zod/dto/location.dto'

const model = defineModel<SocialMatchFilterDTO>({
  default: () => SocialMatchFilterDTOSchema.parse({}),
})

const props = defineProps<{
  viewerProfile: OwnerProfile | null
}>()

const locationDisabled = ref(!model.value.location.country)

const setLocationFromProfile = () => {
  if (props.viewerProfile?.location && model.value.location) {
    Object.assign(model.value.location, props.viewerProfile.location)
  }
}

const toggleDisabled = () => {
  if (!model.value.location) return
  if (locationDisabled.value) {
    Object.assign(model.value.location, { country: '', cityId: '' } as LocationDTO)
  } else {
    // console.log('Setting location from model:', props.viewerProfile?.location)
    model.value.location.country = props.viewerProfile?.location?.country || ''
  }
}
</script>

<template>
  <div class="d-flex flex-column justify-content-center h-100">
    <h5 class="text-center mb-4">
      <!-- I 'm looking for connections... -->
      {{ $t('profiles.browse.filters.social_title') }}
    </h5>
    <div class="mb-2">
      <div class="d-flex flex-row">
        <div class="flex-grow-1">
          <BFormCheckbox v-model="locationDisabled" @change="toggleDisabled">
            <!-- Anywhere -->
            {{ $t('profiles.browse.filters.anywhere') }}
          </BFormCheckbox>
        </div>
        <div class="text-end">
          <BButton
            variant="link-success"
            :disabled="locationDisabled"
            class="p-0"
            :title="$t('profiles.browse.filters.locate_button_title')"
          >
            <IconTarget2 class="svg-icon-lg" @click="setLocationFromProfile" />
          </BButton>
        </div>
      </div>
    </div>
    <fieldset class="mb-4" :disabled="locationDisabled">
      <CountrySelector v-model="model.location" v-if="model.location" />

      <div class="mt-3">
        <CitySelector
          v-model="model.location"
          v-if="model.location"
          :allowEmpty="true"
          :canAddCity="false"
          :cityInputAutoFocus="false"
        />
      </div>
    </fieldset>

    <div>
      <label>
        <!-- Interested in... -->
        {{ $t('profiles.browse.filters.tags_label') }}
      </label>
      <TagSelectComponent v-model="model.tags" :taggable="false" />
    </div>
  </div>
</template>
