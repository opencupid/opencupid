<script setup lang="ts">
import { relativeLocationLabel } from '@/features/shared/composables/useLocationLabel'
import { type LocationDTO } from '@zod/dto/location.dto'
import { type SocialMatchFilterDTO } from '@zod/match/filters.dto'
import { computed } from 'vue';

const props = defineProps<{
  socialFilter: SocialMatchFilterDTO | null
  viewerLocation?: LocationDTO | null
}>()

const interestlist = computed(() => {
  return props.socialFilter?.tags.map(tag => tag.name).join(', ')
})
</script>

<template>
  <div v-if="socialFilter?.location && viewerLocation" >
    {{
      relativeLocationLabel({
        location: socialFilter?.location,
        viewerLocation: viewerLocation,
        showCity: true,
        showCountryLabel: true,
      })
    }}
  </div>
  <div v-if="socialFilter?.tags.length">
    {{ interestlist }}
  </div>
</template>
