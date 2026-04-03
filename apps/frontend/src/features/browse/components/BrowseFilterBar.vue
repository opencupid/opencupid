<script setup lang="ts">
import { ref, watch, onActivated, onDeactivated } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import LocationFilterInput from '@/features/shared/profileform/LocationFilterInput.vue'
import TagFilterSelector from '@/features/shared/profileform/TagFilterSelector.vue'

import type { SocialMatchFilterDTO } from '@zod/match/filters.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import type { PublicTag } from '@zod/tag/tag.dto'

const FILTER_DEBOUNCE_MS = 500

const filter = defineModel<SocialMatchFilterDTO | null>({ default: null })

const props = defineProps<{
  viewerProfile: OwnerProfile | null
  /** Tags available in the current map bounds (from /browse/bounds) */
  availableTags?: PublicTag[]
  /** Currently selected tag IDs for bounds-scoped filtering */
  selectedTagIds?: string[]
}>()

const emit = defineEmits<{
  'filter:changed': []
  'update:selectedTagIds': [ids: string[]]
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

function toggleBoundsTag(id: string) {
  const current = props.selectedTagIds ?? []
  const idx = current.indexOf(id)
  if (idx === -1) emit('update:selectedTagIds', [...current, id])
  else
    emit(
      'update:selectedTagIds',
      current.filter((t) => t !== id)
    )
}

function clearBoundsTags() {
  emit('update:selectedTagIds', [])
}
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
    <!-- Bounds-scoped tags (from map viewport) -->
    <!-- <div
      v-if="availableTags?.length"
      class="d-flex flex-wrap gap-1 mt-2"
    >
      <button
        v-for="tag in availableTags"
        :key="tag.id"
        class="badge rounded-pill border border-secondary-subtle"
        :class="selectedTagIds?.includes(tag.id) ? 'bg-secondary text-white' : 'bg-white text-dark'"
        @click="toggleBoundsTag(tag.id)"
      >
        #{{ tag.name }}
      </button>
      <button
        v-if="selectedTagIds?.length"
        class="badge rounded-pill bg-white text-muted border"
        @click="clearBoundsTags"
      >
        ✕
      </button>
    </div> -->
  </div>
</template>
