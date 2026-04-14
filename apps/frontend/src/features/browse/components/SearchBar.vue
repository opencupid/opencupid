<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'

import SelectableTagList from './SelectableTagList.vue'
import SearchInput from './SearchInput.vue'
import SearchResults from './SearchResults.vue'

import type { LocationDTO, GeoPoint } from '@zod/dto/location.dto'
import type { OwnerProfile } from '@zod/profile/profile.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import { useSearchStore } from '@/features/browse/stores/searchStore'

const props = defineProps<{
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

const searchStore = useSearchStore()
const { selectedTags, searchResults } = storeToRefs(searchStore)
const router = useRouter()

function onSelectProfile(profileId: string) {
  router.push({ name: 'PublicProfile', params: { profileId } })
}

// Drives the LocationSelector's display text only; never read back.
const locationModel = ref<LocationDTO>({ country: '' })

const panelOpen = ref(false)
const pillRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')

onClickOutside(pillRef, closePanel)

function openPanel() {
  panelOpen.value = true
}

function closePanel() {
  panelOpen.value = false
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
}

function handleSetLocationHome() {
  if (!props.viewerProfile?.location) return
  // emit('location:set', props.viewerProfile.location)
}
function onLocationSet(point: GeoPoint) {
  selectedTags.value = []
  emit('location:set', point)
}

watch(searchQuery, (query) => {
  selectedTags.value = []
  searchStore.search(query)
})
</script>

<template>
  <div
    class="search-bar position-relative w-100"
    :class="{ 'search-bar--open': panelOpen }"
    @click.stop
  >
    <div
      ref="pillRef"
      class="search-bar__pill w-100 position-relative d-flex flex-row align-items-center border"
      @click="togglePanel"
    >
      <div class="search-bar__field w-100">
        <SearchInput
          v-model="searchQuery"
          @home:set="handleSetLocationHome"
        />
      </div>

      <div class="search-bar__field search-bar__field--tags">
        <SelectableTagList
          :tags="selectedTags"
          removable
          @remove="selectedTags = []"
        />
      </div>
    </div>
    <div
      class="search-bar__panel position-absolute overflow-y-auto overflow-x-hidden w-100 left-0 top-100 z-1 px-1 pt-1 pb-2"
      :class="panelOpen ? '' : 'pointer-events-none'"
      :aria-hidden="panelOpen ? 'false' : 'true'"
    >
      <SearchResults
        v-if="searchResults"
        :results="searchResults"
        @select:profile="onSelectProfile"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
$pill-radius: 28px;
$panel-height: 30vh;

.search-bar__pill {
  z-index: 2;
  background-color: var(--bs-body-bg);
  border-radius: $pill-radius;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0.25rem 0.5rem;
  transition:
    border-radius 0.15s ease,
    box-shadow 0.15s ease;

  .search-bar--open & {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.1),
      0 4px 12px rgba(0, 0, 0, 0.06);
  }
}

.search-bar__panel {
  height: 0;
  background-color: var(--bs-body-bg);
  border-bottom-left-radius: $pill-radius;
  border-bottom-right-radius: $pill-radius;
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 0.15s ease-in-out,
    height 0.15s ease-in-out,
    transform 0.15s ease-in-out;

  .search-bar--open & {
    height: $panel-height;
    opacity: 1;
    transform: translateY(0);
    border: 1px solid var(--bs-border-color, rgba(0, 0, 0, 0.1));
    border-top: none;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.1),
      0 4px 12px rgba(0, 0, 0, 0.06);
  }
}

.search-bar__field {
  // flex: 1 1 0;
  min-width: 0;
}

:deep(.input-group) {
  .form-control {
    border: none;
    background: transparent;
    box-shadow: none;
  }
}
</style>
