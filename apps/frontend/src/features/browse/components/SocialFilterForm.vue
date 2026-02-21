<script setup lang="ts">
import { ref } from 'vue'

import TagSelectComponent from '@/features/shared/profileform/TagSelectComponent.vue'
import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
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

const locationDisabled = ref(model.value.location.country == '')

const setLocationFromProfile = () => {
  if (props.viewerProfile?.location && model.value.location) {
    Object.assign(model.value.location, props.viewerProfile.location)
  }
}

const toggleDisabled = () => {
  if (!model.value.location) return
  if (locationDisabled.value) {
    Object.assign(model.value.location, {
      country: '',
      cityId: '',
      cityName: '',
      lat: null,
      lon: null,
    } as LocationDTO)
  } else {
    model.value.location.country = props.viewerProfile?.location?.country || ''
    model.value.location.cityName = props.viewerProfile?.location?.cityName || ''
    model.value.location.lat = props.viewerProfile?.location?.lat || null
    model.value.location.lon = props.viewerProfile?.location?.lon || null
  }
}
</script>

<template>
  <div class="d-flex flex-column justify-content-center h-100">
    <h5 class="text-center mb-4">
      <!-- I 'm looking for connections... -->
      {{ $t('profiles.browse.filters.social_title') }}
    </h5>
    <div class="mb-2 mb-md-4">
      <label>
        {{ $t('profiles.browse.filters.near_label') }}
      </label>
      <div class="d-flex flex-row align-items-center">
        <fieldset
          :disabled="locationDisabled"
          class="flex-grow-1"
        >
          <LocationSelector
            v-model="model.location as LocationDTO"
            v-if="model.location"
            :allowEmpty="true"
          />
        </fieldset>
        <div class="ms-2">
          <BButton
            variant="link-success"
            :disabled="locationDisabled"
            class="p-0"
            :title="$t('profiles.browse.filters.locate_button_title')"
          >
            <IconTarget2
              class="svg-icon-lg"
              @click="setLocationFromProfile"
            />
          </BButton>
        </div>
      </div>
      <BFormCheckbox
        v-model="locationDisabled"
        @change="toggleDisabled"
        class="mt-1"
      >
        {{ $t('profiles.browse.filters.anywhere') }}
      </BFormCheckbox>
    </div>

    <div>
      <label>
        <!-- Interested in... -->
        {{ $t('profiles.browse.filters.tags_label') }}
      </label>
      <TagSelectComponent
        v-model="model.tags"
        :taggable="false"
      />
    </div>
  </div>
</template>
