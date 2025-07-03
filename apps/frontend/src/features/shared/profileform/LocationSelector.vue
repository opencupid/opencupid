<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'

import CountrySelector from './CountrySelector.vue'
import CitySelector from './CitySelector.vue'

const model = defineModel<LocationDTO>({
  default: () => ({
    country: '',
    cityId: '',
    cityName: '',
  }),
})

const props = withDefaults(
  defineProps<{
    allowEmpty?: boolean
  }>(),
  {
    allowEmpty: false,
  }
)
</script>

<template>
  <div>
    <CountrySelector v-model="model" v-bind:allow-empty="props.allowEmpty" />

    <div class="mt-3">
      <CitySelector v-model="model" v-bind:allow-empty="props.allowEmpty" />
    </div>
  </div>
</template>
