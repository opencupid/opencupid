<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { onClickOutside } from '@vueuse/core'

import SelectableTagList from './SelectableTagList.vue'
import SearchInput from './SearchInput.vue'
import SearchRefiners from './SearchRefiners.vue'
import SearchMatches from './SearchMatches.vue'
import IconHome from '@/assets/icons/interface/home.svg'

import type { LocationDTO, GeoPoint } from '@zod/dto/location.dto'
import type { OwnerProfile, ProfileSummary } from '@zod/profile/profile.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
import type { PostSummary } from '@zod/post/post.dto'
import { SEARCH_MIN_QUERY_LENGTH } from '@zod/search/search.dto'

import { useSearchStore } from '@/features/browse/stores/searchStore'
import { useGeocodingStore } from '@/features/geocoding/stores/geocodingStore'
import { useI18n } from 'vue-i18n'
import { toGeoPoint } from '../../map/utils/mapUtils'

const props = defineProps<{
  viewerProfile: OwnerProfile | null
  /** Tags available in the current map bounds (from /browse/bounds) */
  availableTags?: PublicTag[]
}>()

const emit = defineEmits<{
  'location:set': [point: GeoPoint]
  'profile:select': [profile: ProfileSummary]
  'post:select': [post: PostSummary]
}>()

const searchStore = useSearchStore()
const geocodingStore = useGeocodingStore()
const {
  selectedTags,
  searchResults,
  isLoading: searchLoading,
  hasResults: searchHasResults,
} = storeToRefs(searchStore)
const {
  results: geocodedLocations,
  isLoading: geocodingLoading,
  hasResults: geocodingHasResults,
} = storeToRefs(geocodingStore)
const { locale } = useI18n()

const pillRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')

const panelOpen = ref(false)

const isLoading = computed(() => searchLoading.value || geocodingLoading.value)
const haveResults = computed(() => searchHasResults.value || geocodingHasResults.value)

onClickOutside(pillRef, closePanel)

function closePanel() {
  panelOpen.value = false
}

function openPanel() {
  if (!haveResults.value) return
  panelOpen.value = true
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
  geocodingStore.clear()
}

function onSelectTag(tag: PublicTag) {
  selectedTags.value = [tag]
}

function onSelectProfile(profile: ProfileSummary) {
  const point = toGeoPoint(profile.location)
  if (point) emit('location:set', point)
  emit('profile:select', profile)
}

function onSelectPost(post: PostSummary) {
  const point = toGeoPoint(post.location)
  if (point) emit('location:set', point)
  emit('post:select', post)
}

const isSearchMatchesEmpty = computed(
  () => !searchResults.value?.profiles.length && !searchResults.value?.posts.length
)

watch(searchQuery, (query) => {
  if (query.trim().length < SEARCH_MIN_QUERY_LENGTH) {
    searchStore.searchResults = null
    geocodingStore.clear()
    return
  }
  // Fire both searches in parallel — each store owns its own abort controller,
  // so rapid re-typing cancels prior in-flight requests on both sides.
  searchStore.search(query)
  geocodingStore.search(query, locale.value, props.viewerProfile?.location)
})

watch(haveResults, () => {
  if (!panelOpen.value) panelOpen.value = true
})
</script>

<template>
  <div
    class="search-bar position-relative col-12 col-md-8 col-lg-6"
    :class="{ 'search-bar--open': panelOpen }"
    @click.stop
  >
    <div
      ref="pillRef"
      class="search-bar__pill w-100 position-relative d-flex flex-row align-items-center border"
      @click="openPanel"
    >
      <div class="d-flex align-items-center gap-1 flex-grow-1 min-w-0">
        <SearchInput
          v-model="searchQuery"
          class="flex-grow-1 flex-shrink-1 min-w-0"
        />

        <SelectableTagList
          :tags="selectedTags"
          removable
          @remove="selectedTags = []"
          class="flex-grow-0 flex-shrink-0"
        />
        <BButton
          variant="link-secondary"
          size="sm"
          class="mx-1 p-0 flex-grow-0 flex-shrink-0"
          :title="$t('profiles.browse.filters.locate_button_title')"
          @click.stop="handleSetLocationHome"
        >
          <IconHome class="svg-icon-md" />
        </BButton>
      </div>
    </div>
    <div
      class="search-bar__panels position-absolute w-100 left-0 top-100 z-1 d-flex flex-column gap-2"
      :class="panelOpen ? '' : 'pointer-events-none'"
      :aria-hidden="panelOpen ? 'false' : 'true'"
    >
      <div class="search-bar__refiners shadow">
        <SearchRefiners
          :tags="searchResults?.tags ?? []"
          :geocoded-locations="geocodedLocations"
          :isLoading="isLoading"
          @location:select="onSelectLocation"
          @tag:select="onSelectTag"
        />
      </div>
      <div
        class="search-bar__matches py-2 shadow"
        v-if="!isSearchMatchesEmpty"
      >
        <SearchMatches
          :profiles="searchResults?.profiles ?? []"
          :posts="searchResults?.posts ?? []"
          @profile:select="onSelectProfile"
          @post:select="onSelectPost"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins/breakpoints';

$pill-radius: 28px;
// Generous wrapper cap — children set their own heights; the wrapper
// just needs room to hold the tallest possible combined stack. `dvh`
// (dynamic viewport height) accounts for mobile browser URL-bar chrome.
$panels-max: calc(100dvh - 6rem);

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

// Shared visual treatment for both panels — bg, border, shadow.
// Responsive vh sizing: panels claim more viewport on small screens
// (where absolute pixel space is scarce) and relax on larger screens
// where 30vh already yields plenty of pixels.
.search-bar__refiners,
.search-bar__matches {
  background-color: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color, rgba(0, 0, 0, 0.1));
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    0 4px 12px rgba(0, 0, 0, 0.06);

  min-height: 4rem;
  max-height: 45dvh;
  overflow-y: auto;
  overflow-x: hidden;

  @include media-breakpoint-up(md) {
    max-height: 40dvh;
  }
  @include media-breakpoint-up(lg) {
    max-height: 35dvh;
  }
}

// Refiners fuse with the pill: flat top, rounded bottom, no top border.
.search-bar__refiners {
  border-top: none;
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
}

// Matches floats below with its own fully-rounded card look.
.search-bar__matches {
  border-radius: 1rem;
}

// Invisible wrapper — only handles open/close transition + positioning.
// Visual treatment (bg, border, radius, shadow) lives in SearchPanel.vue
// so each child is a distinct, separable surface.
.search-bar__panels {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
  overflow: hidden;
  transition:
    opacity 0.15s ease-in-out,
    max-height 0.15s ease-in-out,
    transform 0.15s ease-in-out;

  .search-bar--open & {
    max-height: $panels-max;
    opacity: 1;
    transform: translateY(0);
    overflow: visible;
  }
}

:deep(.input-group) {
  .form-control {
    border: none;
    background: transparent;
    box-shadow: none;
  }
}
</style>
