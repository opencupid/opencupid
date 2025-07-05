<script setup lang="ts">
import { type LocationDTO } from '@zod/dto/location.dto'
import { type DatingPreferencesDTO } from '@zod/match/filters.dto'
import IconSearch from '@/assets/icons/interface/search.svg'
import GenderSymbol from '@/features/shared/profiledisplay/GenderSymbol.vue'

const model = defineModel<DatingPreferencesDTO | null>({
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
      <span class="me-2">Age: {{ model?.prefAgeMin }} - {{ model?.prefAgeMax }}</span>
      <GenderSymbol v-for="pref in model?.prefGender" :key="pref" :gender="pref" />
    </div>

    <div class="flex-shrink-1">
      <BButton variant="link" pill class="text-white py-0 ms-2" :disabled="prefsButtonDisabled">
        <IconSearch class="svg-icon" />
      </BButton>
    </div>
  </div>
</template>
