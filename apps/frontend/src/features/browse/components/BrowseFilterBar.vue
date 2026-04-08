<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import LocationFilterInput from '@/features/shared/profileform/LocationFilterInput.vue'
import TagSelector from '@/features/shared/profileform/TagSelector.vue'

import type { LocationDTO } from '@zod/dto/location.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import { useBrowseFiltersStore } from '@/features/browse/stores/browseFiltersStore'

const props = defineProps<{
  viewerProfile: OwnerProfile | null
  /** Tags available in the current map bounds (from /browse/bounds) */
  availableTags?: PublicTag[]
}>()

const emit = defineEmits<{
  /**
   * Emitted when the user picks a location from the selector. Consumers
   * should pan the map to these coordinates; the location input no
   * longer filters any backend query.
   */
  'location:fly-to': [coords: { lat: number; lon: number }]
}>()

const filtersStore = useBrowseFiltersStore()
const { selectedTagIds } = storeToRefs(filtersStore)

// Local ephemeral location, used only to drive the LocationSelector
// display. Not persisted, not sent to the backend.
const locationModel = ref<LocationDTO>({ country: '' })

function onLocationFlyTo(coords: { lat: number; lon: number }) {
  emit('location:fly-to', coords)
}

// v-model binding for the TagSelector: it expects `PublicTag[]` but we
// store only `string[]` (IDs) in the filters store. Derive the full
// tag objects from the currently-available tag list.
const selectedTagObjects = computed<PublicTag[]>({
  get() {
    const lookup = new Map((props.availableTags ?? []).map((t) => [t.id, t]))
    return selectedTagIds.value.map((id) => lookup.get(id)).filter((t): t is PublicTag => t != null)
  },
  set(tags: PublicTag[]) {
    filtersStore.setTags(tags.map((t) => t.id))
  },
})
</script>

<template>
  <BRow @click.stop>
    <!-- Location column -->
    <div class="col-12 col-md-6">
      <LocationFilterInput
        v-model="locationModel"
        :viewer-profile="viewerProfile"
        @location:fly-to="onLocationFlyTo"
      />
    </div>
    <!-- Tags column -->
    <div class="col-12 col-md-6">
      <TagSelector
        v-model="selectedTagObjects"
        :taggable="false"
        open-direction="bottom"
        :close-on-select="true"
        :initialOptions="availableTags ?? []"
      />
    </div>
  </BRow>
</template>
