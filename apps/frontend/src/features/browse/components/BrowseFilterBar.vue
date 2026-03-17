<script setup lang="ts">
import { ref, watch, onActivated, onDeactivated } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import LocationFilterInput from '@/features/shared/profileform/LocationFilterInput.vue'
import TagFilterSelector from '@/features/shared/profileform/TagFilterSelector.vue'

import type { SocialMatchFilterDTO } from '@zod/match/filters.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'

const FILTER_DEBOUNCE_MS = 500

const filter = defineModel<SocialMatchFilterDTO | null>({ default: null })

const props = defineProps<{
  viewerProfile: OwnerProfile | null
}>()

const emit = defineEmits<{
  'filter:changed': []
}>()

const isActive = ref(true)
onActivated(() => (isActive.value = true))
onDeactivated(() => (isActive.value = false))

function setLocationFromProfile() {
  if (props.viewerProfile?.location && filter.value?.location) {
    Object.assign(filter.value.location, props.viewerProfile.location)
    emit('filter:changed')
  }
}

const debouncedEmitChanged = useDebounceFn(() => emit('filter:changed'), FILTER_DEBOUNCE_MS)

watch(
  () =>
    filter.value && {
      country: filter.value.location.country,
      cityName: filter.value.location.cityName,
      tags: filter.value.tags.map((t) => t.id).join(','),
    },
  (newVal, oldVal) => {
    if (!isActive.value) return
    if (!oldVal || !newVal) return
    if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
      debouncedEmitChanged()
    }
  }
)
</script>

<template>
  <div
    class="filter-area flex-grow-1"
    @click.stop
  >
    <div
      class="row g-2"
      v-if="filter"
    >
      <!-- Location column -->
      <div class="col-12 col-md-6">
        <LocationFilterInput
          v-model="filter.location"
          :viewer-profile="viewerProfile"
          @location:set-from-profile="$emit('filter:changed')"
        />
      </div>
      <!-- Tags column -->
      <div class="col-12 col-md-6">
        <TagFilterSelector
          v-model="filter.tags"
          :initialOptions="viewerProfile?.tags ?? []"
        />
      </div>
    </div>
  </div>
</template>
