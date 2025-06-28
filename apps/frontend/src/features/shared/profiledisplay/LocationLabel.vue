<script setup lang="ts">
import { computed } from 'vue'

import { type LocationDTO } from '@zod/dto/location.dto'
import { useCountries } from '@/features/shared/composables/useCountries'

const props = withDefaults(
  defineProps<{
    location: LocationDTO
    showCity?: boolean
    showCountryLabel?: boolean
    showIcon?: boolean
  }>(),
  {
    showCity: true,
    showCountryLabel: true,
    showIcon: true,
  }
)

const { countryCodeToName } = useCountries()

const countryName = computed(() => {
  return props.location.country ? countryCodeToName(props.location.country) : ''
})
</script>

<template>
  <span v-if="location">
    <span v-if="location.cityName && showCity">{{ location.cityName }}, </span>
    <span v-if="location.country && showCountryLabel">{{ countryName }}</span>
    <span v-if="location.country && showIcon" class="flag-icon" @click="$event.stopPropagation()">
      <BTooltip :delay="100" placement="top" :title="countryName">
        <template #target>
          <CircleFlags
            :newFlagName="countryName"
            :showFlagName="true"
            size="small"
            :country="location.country"
            title=""
          />
        </template>
        {{ countryName }}
      </BTooltip>
    </span>
  </span>
</template>
