<script setup lang="ts">
import { type DatingPreferencesDTO } from '@zod/match/filters.dto'

import GenderSymbol from '@/features/shared/profiledisplay/GenderSymbol.vue'

const datingPrefs = defineModel<DatingPreferencesDTO | null>({
  default: null,
})
</script>

<template>
  <div class="flex-grow-1 d-flex align-items-center">
    <strong class="me-3">
      {{ $t('profiles.browse.filters.age_range') }}
      {{ datingPrefs?.prefAgeMin }} - {{ datingPrefs?.prefAgeMax }}</strong
    >
    <GenderSymbol
      v-for="pref in datingPrefs?.prefGender"
      :key="pref"
      :gender="pref"
      class="me-2"
    />
  </div>
</template>
