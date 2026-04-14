<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'

import SelectableTagList from './SelectableTagList.vue'
import SearchInput from './SearchInput.vue'
import SearchResults from './SearchResults.vue'

import type { LocationDTO, GeoPoint } from '@zod/dto/location.dto'
import type { OwnerProfile, ProfileSummary } from '@zod/profile/profile.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import { useSearchStore } from '@/features/browse/stores/searchStore'
import { useGeocodingStore } from '@/features/geocoding/stores/geocodingStore'
import { useI18n } from 'vue-i18n'
import type { Profile } from '../../../../../../packages/shared/zod/generated'
import { toGeoPoint } from '../../map/utils/mapUtils'
import type { PostSummary } from '../../../../../../packages/shared/zod/post/post.dto'

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
const geocodingStore = useGeocodingStore()
const { selectedTags, searchResults } = storeToRefs(searchStore)
const { results: geocodedLocations } = storeToRefs(geocodingStore)
const router = useRouter()
const { locale } = useI18n()

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
  const point = toGeoPoint(props.viewerProfile?.location)
  if (point) emit('location:set', point)
}

function onSelectLocation(location: LocationDTO) {
  const point = toGeoPoint(location)
  if (!point) return
  selectedTags.value = []
  emit('location:set', point)
}

function onSelectProfile(profile: ProfileSummary) {
  router.push({ name: 'PublicProfile', params: { profileId: profile.id } })
}

function onSelectTag(tag: PublicTag) {
  // TODO
  selectedTags.value = [tag]
}

function onSelectPost(post: PostSummary) {
  // TODO
  const point = toGeoPoint(post.location)
  if (!point) return
  selectedTags.value = []
  emit('location:set', point)
}

watch(searchQuery, (query) => {
  selectedTags.value = []
  // Fire both searches in parallel — each store owns its own abort controller,
  // so rapid re-typing cancels prior in-flight requests on both sides.
  searchStore.search(query)
  geocodingStore.search(query, locale.value)
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
      class="search-bar__panel position-absolute overflow-y-auto overflow-x-hidden w-100 left-0 top-100 z-1 pt-1 pb-2"
      :class="panelOpen ? '' : 'pointer-events-none'"
      :aria-hidden="panelOpen ? 'false' : 'true'"
    >
      <SearchResults
        v-if="searchResults"
        :results="searchResults"
        :geocoded-locations="geocodedLocations"
        @profile:select="onSelectProfile"
        @location:select="onSelectLocation"
        @tag:select="onSelectTag"
        @post:select="onSelectPost"
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
