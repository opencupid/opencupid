<script setup lang="ts">
import { type DatingPreferencesFormType } from '@zod/match/filters.form'

import GenderSymbol from '@/features/shared/profiledisplay/GenderSymbol.vue'

const datingPrefs = defineModel<DatingPreferencesFormType | null>({
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
