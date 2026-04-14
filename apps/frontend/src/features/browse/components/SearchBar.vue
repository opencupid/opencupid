<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { onClickOutside } from '@vueuse/core'

import LocationFilterInput from '@/features/shared/profileform/LocationFilterInput.vue'
import SelectableTagList from './SelectableTagList.vue'
import IconHome from '@/assets/icons/interface/home.svg'
import IconSearch from '@/assets/icons/interface/search.svg'

import type { LocationDTO, GeoPoint } from '@zod/dto/location.dto'
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
   * Emitted when the user picks a location from the selector.
   */
  'location:set': [point: GeoPoint]
}>()

const filtersStore = useBrowseFiltersStore()
const { selectedTags, searchResults } = storeToRefs(filtersStore)

function thumbUrl(variants: { size: string; url: string }[]): string | undefined {
  return (variants.find((v) => v.size === 'thumb') ?? variants[0])?.url
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
  filtersStore.search(query)
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
        <div class="d-flex align-items-center">
          <div class="flex-grow-1 flex-shrink-0">
            <BInputGroup
              class="input-group d-flex align-items-center w-100"
              size="sm"
            >
              <template #prepend>
                <IconSearch
                  class="svg-icon ms-2 text-secondary"
                  :title="$t('profiles.forms.city_search_placeholder')"
                />
              </template>
              <BFormInput
                v-model="searchQuery"
                debounce="300"
                placeholder="Search"
              />

            </BInputGroup>
          </div>
          <BButton
            variant="link-secondary"
            size="sm"
            class="mx-1 p-0"
            :title="$t('profiles.browse.filters.locate_button_title')"
            @click="handleSetLocationHome"
          >
            <IconHome class="svg-icon-md" />
          </BButton>
        </div>
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
      <div
        v-if="searchResults"
        class="search-bar__results d-flex flex-column gap-2"
      >
        <section
          v-if="searchResults.tags.length"
          class="search-bar__group"
        >
          <h6 class="search-bar__group-title text-uppercase small text-secondary mb-1">
            Tags
          </h6>
          <SelectableTagList :tags="searchResults.tags" />
        </section>

        <section
          v-if="searchResults.profiles.length"
          class="search-bar__group"
        >
          <h6 class="search-bar__group-title text-uppercase small text-secondary mb-1">
            Profiles
          </h6>
          <ul class="list-unstyled m-0">
            <li
              v-for="profile in searchResults.profiles"
              :key="profile.id"
              class="search-bar__profile py-1"
            >
              <RouterLink
                :to="{ name: 'PublicProfile', params: { profileId: profile.id } }"
                class="d-flex align-items-center gap-2 text-decoration-none text-body"
              >
                <img
                  v-if="thumbUrl(profile.profileImages[0]?.variants ?? [])"
                  :src="thumbUrl(profile.profileImages[0]?.variants ?? [])"
                  :alt="profile.publicName"
                  class="search-bar__avatar rounded-circle"
                />
                <span
                  v-else
                  class="search-bar__avatar search-bar__avatar--placeholder rounded-circle bg-secondary-subtle"
                ></span>
                <span class="text-truncate">{{ profile.publicName }}</span>
              </RouterLink>
            </li>
          </ul>
        </section>

        <section
          v-if="searchResults.posts.length"
          class="search-bar__group"
        >
          <h6 class="search-bar__group-title text-uppercase small text-secondary mb-1">
            Posts
          </h6>
          <ul class="list-unstyled m-0">
            <li
              v-for="post in searchResults.posts"
              :key="post.id"
              class="search-bar__post py-1"
            >
              <div class="small text-secondary">{{ post.postedBy.publicName }}</div>
              <div class="text-truncate">{{ post.content }}</div>
            </li>
          </ul>
        </section>

        <section
          v-if="searchResults.locations.length"
          class="search-bar__group"
        >
          <h6 class="search-bar__group-title text-uppercase small text-secondary mb-1">
            Locations
          </h6>
          <ul class="list-unstyled m-0">
            <li
              v-for="(loc, i) in searchResults.locations"
              :key="`${loc.country}-${loc.cityName ?? ''}-${i}`"
              class="search-bar__location py-1 text-truncate"
            >
              {{ loc.cityName ? `${loc.cityName}, ${loc.country}` : loc.country }}
            </li>
          </ul>
        </section>

        <div
          v-if="
            !searchResults.tags.length &&
            !searchResults.profiles.length &&
            !searchResults.posts.length &&
            !searchResults.locations.length
          "
          class="text-center text-secondary small py-3"
        >
          No results
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$pill-radius: 28px;
$panel-height: 30vh;

.search-bar__pill {
  z-index: 2;
  background-color: var(--bs-body-bg );
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

.search-bar__avatar {
  width: 32px;
  height: 32px;
  object-fit: cover;
  flex-shrink: 0;
}



:deep(.input-group) {
  .form-control {
    border: none;
    background: transparent;
    box-shadow: none;
  }
}


</style>
