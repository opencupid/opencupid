<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'
import { type DatingPreferencesDTO } from '@zod/match/filters.dto'
import IconSearch from '@/assets/icons/interface/search.svg'
import GenderSymbol from '@/features/shared/profiledisplay/GenderSymbol.vue'

const datingPrefs = defineModel<DatingPreferencesDTO | null>({
  default: null,
})

const props = defineProps<{
  viewerLocation?: LocationDTO | null
  prefsButtonDisabled?: boolean
}>()

defineEmits<{
  (event: 'prefs:toggle'): void
}>()
</script>

<template>
  <div
    class="d-flex align-items-center justify-content-between w-100 clickable bg-secondary rounded-2 px-2 py-1 text-white"
    @click="$emit('prefs:toggle')"
  >
    <div class="flex-grow-1 d-flex align-items-center">
      <span class="me-3">
        {{ $t('profiles.browse.filters.age_range') }}
        {{ datingPrefs?.prefAgeMin }} - {{ datingPrefs?.prefAgeMax }}</span
      >
      <GenderSymbol v-for="pref in datingPrefs?.prefGender" :key="pref" :gender="pref" class="me-2"/>
    </div>

    <div class="flex-shrink-1">
      <BButton
        variant="link"
        pill
        class="text-white py-0 ms-2"
        :title="$t('profiles.browse.filters.search_button_title_dating')"
      >
        <IconSearch class="svg-icon" />
      </BButton>
    </div>
  </div>
</template>
