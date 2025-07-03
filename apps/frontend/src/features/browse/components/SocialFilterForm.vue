<script setup lang="ts">
import { SocialMatchFilterDTO, SocialMatchFilterDTOSchema } from '@zod/match/filters.dto'

import TagSelectComponent from '@/features/shared/profileform/TagSelectComponent.vue'
import CountrySelector from '@/features/shared/profileform/CountrySelector.vue'
import CitySelector from '@/features/shared/profileform/CitySelector.vue'

const model = defineModel<SocialMatchFilterDTO>({
  default: () => SocialMatchFilterDTOSchema.parse({}),
})
</script>

<template>
  <div class="d-flex flex-column justtify-content-center h-100">
    <h4>I 'm looking for connections in...</h4>
    <CountrySelector v-model="model.location.country"  v-if="model.location"/>

    <div class="mt-3">
      <CitySelector v-model="model.location" :required="true"  v-if="model.location"/>
    </div>

    <div>
      <h4>Interested in...</h4>
      <TagSelectComponent
        v-model="model.tags"
        label="Select interests"
        placeholder="Interested in"
        :taggable="false"
      />
    </div>
  </div>
</template>
