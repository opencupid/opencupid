<script setup lang="ts">
import { computed } from 'vue'

import { type SearchLocationDTO, type LocationDTO } from '@zod/dto/location.dto'
import { useCountries } from '@/features/shared/composables/useCountries'
import CountryFlag from '@/features/shared/ui/CountryFlag.vue'

const props = withDefaults(
  defineProps<{
    location: LocationDTO | SearchLocationDTO
    viewerLocation?: LocationDTO
    showCity?: boolean
    showCountryLabel?: boolean
    showCountryIcon?: boolean
    showOnlyForeignCountry?: boolean
  }>(),
  {
    showCity: true,
    showCountryLabel: true,
    showCountryIcon: true,
    showOnlyForeignCountry: true,
  }
)

const { countryCodeToName } = useCountries()

const countryName = computed(() => {
  return props.location.country ? countryCodeToName(props.location.country) : ''
})

const isSameCountry = computed(() => {
  return props.viewerLocation?.country === props.location.country
})

const shouldRenderCity = computed(() => {
  return !!props.location.cityName && (isSameCountry.value || props.showCity)
})

// const shouldRenderCountry = computed(() => {
//   return !!props.location.country && (!isSameCountry.value || props.showCountryLabel)
// })

const shouldRenderCountry = computed(() => {
  if (!props.location.country) return false

  // If we only show foreign countries, block same-country cases
  if (props.showOnlyForeignCountry) {
    // If viewer country missing → treat as not foreign (strict)
    if (!props.viewerLocation?.country) return false
    if (isSameCountry.value) return false
  }

  // Still respect label/icon flags
  return props.showCountryLabel || props.showCountryIcon
})

const countryCode = computed(() => {
  return props.location.country?.toLowerCase()
})
</script>

<template>
  <span v-if="location">
    <span v-if="shouldRenderCity">{{ location.cityName }}</span>
    <span v-if="shouldRenderCity && showCountryLabel && shouldRenderCountry">, </span>

    <span v-if="shouldRenderCountry">
      <template v-if="showCountryLabel">
        {{ countryName }}
      </template>

      <span
        v-if="showCountryIcon"
        @click="$event.stopPropagation()"
      >
        <BTooltip
          :delay="100"
          placement="top"
          :title="countryName"
        >
          <template #target>
            <CountryFlag
              :code="countryCode"
              size="32"
              circle
              :title="countryName"
            />
          </template>
          {{ countryName }}
        </BTooltip>
      </span>
    </span>
  </span>
</template>
