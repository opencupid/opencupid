<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import LocationFilterInput from '@/features/shared/profileform/LocationFilterInput.vue'
import TagSelector from '@/features/shared/profileform/TagSelector.vue'

import type { LocationDTO, GeoPoint } from '@zod/dto/location.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import { useBrowseFiltersStore } from '@/features/browse/stores/browseFiltersStore'

defineProps<{
  viewerProfile: OwnerProfile | null
  /** Tags available in the current map bounds (from /browse/bounds) */
  availableTags?: PublicTag[]
}>()

const emit = defineEmits<{
  /**
   * Emitted when the user picks a location from the selector.
   * Consumers should pan the map to these coordinates.
   */
  'location:set': [point: GeoPoint]
}>()

const filtersStore = useBrowseFiltersStore()
// Bind the TagSelector v-model directly to the store's PublicTag[] state.
// Storing full tag objects (not just IDs) means tags picked via the
// autocomplete search — which queries the global tag store and may
// return tags that aren't in the bounds-scoped `availableTags` list —
// always render their pill correctly.
const { selectedTags } = storeToRefs(filtersStore)

// Drives the LocationSelector's display text only; never read back.
const locationModel = ref<LocationDTO>({ country: '' })

function onLocationSet(point: GeoPoint) {
  emit('location:set', point)
}
</script>

<template>
  <BRow @click.stop>
    <!-- Location column -->
    <div class="col-12 col-md-6">
      <LocationFilterInput
        v-model="locationModel"
        :viewer-profile="viewerProfile"
        @location:set="onLocationSet"
      />
    </div>
    <!-- Tags column -->
    <div class="col-12 col-md-6">
      <TagSelector
        v-model="selectedTags"
        :taggable="false"
        open-direction="bottom"
        :close-on-select="true"
        :initialOptions="availableTags ?? []"
      />
    </div>
  </BRow>
</template>
