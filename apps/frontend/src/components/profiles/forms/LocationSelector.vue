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

</script>

<template>
  <div>
    <CountrySelector v-model="model.country" />

    <div class="mt-3">
      <CitySelector v-model="model" :required="true" />
    </div>
  </div>
</template>
