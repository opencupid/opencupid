<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import LocationFilterInput from '@/features/shared/profileform/LocationFilterInput.vue'
import TagSelector from '@/features/shared/profileform/TagSelector.vue'
import TagFilterSelector from '@/features/shared/profileform/TagFilterSelector.vue'
import TagList from '@/features/shared/profiledisplay/TagList.vue'

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
  <div
    class="search-bar"
    @click.stop
  >
    <div class="search-bar__pill">
      <div class="search-bar__field search-bar__field--location">
        <LocationFilterInput
          v-model="locationModel"
          :viewer-profile="viewerProfile"
          @location:set="onLocationSet"
        />
      </div>
      <div
        class="search-bar__divider"
        aria-hidden="true"
      />
      <div class="search-bar__field search-bar__field--tags">
        <TagList :tags="selectedTags" />
      </div>
      <div
        class="search-bar__panel"
        aria-hidden="true"
      >
        <TagFilterSelector
          v-model="selectedTags"
          :initialOptions="availableTags ?? []"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Google-Maps-style search control:
//   .search-bar          — positioning shell (anchors the panel)
//   .search-bar__pill    — visible rounded bar holding both inputs
//   .search-bar__panel   — empty backdrop that drops down on focus,
//                          providing the visual surface that the
//                          multiselect dropdowns overlay onto.
// The multiselect inputs inside the pill are stripped of their own
// chrome via :deep() overrides so the pill reads as one continuous
// control.

$pill-radius: 28px;
$panel-height: 30vh;

.search-bar {
  position: relative;
  width: 100%;
}

.search-bar__pill {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  width: 100%;
  background-color: var(--bs-body-bg, #fff);
  border-radius: $pill-radius;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0.25rem 0.5rem;
  transition:
    border-radius 0.15s ease,
    box-shadow 0.15s ease;
}

// When any input inside the search bar gains focus, the pill flattens
// its bottom edge into the panel and the panel slides into view.
.search-bar:focus-within {
  .search-bar__pill {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.1),
      0 4px 12px rgba(0, 0, 0, 0.06);
  }

  .search-bar__panel {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
}

.search-bar__panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1;
  height: $panel-height;
  background-color: var(--bs-body-bg, #fff);
  border-bottom-left-radius: $pill-radius;
  border-bottom-right-radius: $pill-radius;
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.08),
    0 16px 32px rgba(0, 0, 0, 0.06);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.search-bar__field {
  flex: 1 1 0;
  min-width: 0;
}

.search-bar__divider {
  flex: 0 0 1px;
  align-self: stretch;
  margin: 0.5rem 0.5rem;
  background-color: var(--bs-border-color, rgba(0, 0, 0, 0.1));
}

// Strip the multiselect inputs of their own borders/background so the
// outer pill is the only visible frame. Targets vue-multiselect's
// stable class names, including the --active state which re-applies
// top/bottom borders when the dropdown opens.
:deep(.multiselect__tags),
:deep(.multiselect--active .multiselect__tags),
:deep(.multiselect--above.multiselect--active .multiselect__tags) {
  border: none;
  background: transparent;
  min-height: 38px;
  padding-top: 8px;
  padding-bottom: 0;
}

:deep(.multiselect__single),
:deep(.multiselect__input) {
  background: transparent;
  border: none;
  box-shadow: none;
  outline: none;
}

:deep(.multiselect__input:focus),
:deep(.multiselect__input:focus-visible) {
  outline: none;
  box-shadow: none;
}

:deep(.multiselect),
:deep(.multiselect:focus),
:deep(.multiselect--active),
:deep(.multiselect--active .multiselect__content-wrapper) {
  box-shadow: none;
  outline: none;
}

// The "use my profile location" button sits inline with the location
// input; tighten its margin so it reads as part of the pill, not a
// floating affordance.
:deep(.location-selector) {
  width: 100%;
}
</style>
