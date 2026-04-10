<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import LocationFilterInput from '@/features/shared/profileform/LocationFilterInput.vue'
import SelectableTagList from './SelectableTagList.vue'

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
const { selectedTags } = storeToRefs(filtersStore)

// Drives the LocationSelector's display text only; never read back.
const locationModel = ref<LocationDTO>({ country: '' })

const panelOpen = ref(false)

function openPanel() {
  panelOpen.value = true
}

function closePanel() {
  panelOpen.value = false
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
}

function onLocationSet(point: GeoPoint) {
  selectedTags.value = []
  emit('location:set', point)
}
</script>

<template>
  <div
    class="search-bar position-relative w-100"
    :class="{ 'search-bar--open': panelOpen }"
    @click.stop
  >
    <div class="search-bar__pill w-100 position-relative d-flex flex-row align-items-center"
    @click="togglePanel">
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
        <SelectableTagList
          :tags="selectedTags"
          removable
          @remove="selectedTags = []"
        />
      </div>
      <div
        class="search-bar__panel position-absolute overflow-y-auto overflow-x-hidden w-100 left-0 top-100 z-1 pointer-events-none shadow"
        aria-hidden="true"
      >
        <SelectableTagList
          :tags="availableTags ?? []"
          selectable
          @select="selectedTags = [$event]"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$pill-radius: 28px;
$panel-height: 30vh;

.search-bar__pill {
  z-index: 2;
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

// When the panel is open, the pill flattens its bottom edge into the
// panel and the panel slides into view.
.search-bar--open {
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
  height: $panel-height;
  background-color: var(--bs-body-bg);
  border-bottom-left-radius: $pill-radius;
  border-bottom-right-radius: $pill-radius;
  opacity: 0;
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
  border: none;
}

// The "use my profile location" button sits inline with the location
// input; tighten its margin so it reads as part of the pill, not a
// floating affordance.
:deep(.location-selector) {
  width: 100%;
}
</style>
