<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'

import ProfileBrowseLayout from '../components/ProfileBrowseLayout.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
import TagSelector from '@/features/shared/profileform/TagSelector.vue'
import TagCloud from '@/features/shared/components/TagCloud.vue'
import IconTarget2 from '@/assets/icons/interface/target-2.svg'
import IconTag from '@/assets/icons/e-commerce/tag.svg'

import { useSocialMatchViewModel } from '../composables/useSocialMatchViewModel'
import type { PublicProfile } from '@zod/profile/profile.dto'
import type { PopularTag } from '@zod/tag/tag.dto'

defineOptions({ name: 'SocialMatch' })

const { t } = useI18n()

const {
  viewerProfile,
  haveResults,
  isLoading,
  profileList,
  matchedProfileIds,
  socialFilter,
  isInitialized,
  hideProfile,
  updatePrefs,
  openProfile,
  onBoundsChanged,
  initialize,
} = useSocialMatchViewModel()

const MAP_BOUNDS_DEBOUNCE_MS = 500

const debouncedOnBoundsChanged = useDebounceFn(
  (bounds: { south: number; north: number; west: number; east: number }) => onBoundsChanged(bounds),
  MAP_BOUNDS_DEBOUNCE_MS
)

onMounted(async () => {
  await initialize()
})

const getProfileImage = (profile: PublicProfile) => {
  return profile.profileImages?.[0]
}

const mapCenter = computed<[number, number]>(() => {
  const loc = socialFilter.value?.location
  if (loc?.lat && loc?.lon) return [loc.lat, loc.lon]
  return [47.0, 19.0] // default: Central Europe
})

// --- Inline filter logic ---

const showTagCloud = ref(false)

function setLocationFromProfile() {
  if (viewerProfile.value?.location && socialFilter.value?.location) {
    Object.assign(socialFilter.value.location, viewerProfile.value.location)
    updatePrefs()
  }
}

function handleTagCloudSelect(tag: PopularTag) {
  if (!socialFilter.value) return
  const exists = socialFilter.value.tags.some((t) => t.id === tag.id)
  if (!exists) {
    socialFilter.value.tags = [
      ...socialFilter.value.tags,
      { id: tag.id, name: tag.name, slug: tag.slug },
    ]
  }
  showTagCloud.value = false
  updatePrefs()
}

const debouncedUpdatePrefs = useDebounceFn(() => updatePrefs(), 500)

// Watch for inline filter changes (location/tags edits via the selectors)
watch(
  () =>
    socialFilter.value && {
      country: socialFilter.value.location.country,
      cityName: socialFilter.value.location.cityName,
      tags: socialFilter.value.tags.map((t) => t.id).join(','),
    },
  (newVal, oldVal) => {
    if (!oldVal || !newVal) return
    if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
      debouncedUpdatePrefs()
    }
  }
)
</script>

<template>
  <ProfileBrowseLayout
    :viewerProfile="viewerProfile"
    :profileList="profileList"
    :isLoading="isLoading"
    :isInitialized="isInitialized"
    :haveResults="haveResults"
    @profile:open="openProfile"
    @profile:hidden="hideProfile"
  >
    <template #filter-bar>
      <div
        class="filter-area flex-grow-1"
        @click.stop
      >
        <div
          class="row g-2"
          v-if="socialFilter"
        >
          <!-- Location column -->
          <div class="col-12 col-md-6">
            <div class="d-flex align-items-center gap-2">
              <div class="flex-grow-1">
                <LocationSelector
                  v-model="socialFilter.location"
                  open-direction="bottom"
                  :allow-empty="true"
                  :close-on-select="true"
                  v-if="socialFilter"
                />
              </div>
              <BButton
                variant="link-success"
                size="sm"
                class="p-0"
                :title="t('profiles.browse.filters.locate_button_title')"
                @click="setLocationFromProfile"
              >
                <IconTarget2 class="svg-icon-lg" />
              </BButton>
            </div>
          </div>
          <!-- Tags column -->
          <div class="col-12 col-md-6">
            <div class="d-flex align-items-center gap-2">
              <div class="flex-grow-1 fs-6">
                <TagSelector
                  v-model="socialFilter.tags"
                  :taggable="false"
                  open-direction="bottom"
                  :close-on-select="true"
                  :initialOptions="viewerProfile?.tags ?? []"
                  v-if="socialFilter"
                />
              </div>
              <BButton
                variant="link-secondary"
                size="sm"
                @click="showTagCloud = true"
                :title="t('profiles.browse.filters.explore_tags')"
              >
                <IconTag class="svg-icon-lg" />
              </BButton>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #results="{ onProfileSelect }">
      <MapView
        :items="profileList"
        :center="mapCenter"
        :is-loading="isLoading"
        :is-placeholder-animated="true"
        :get-location="(profile: PublicProfile) => profile.location"
        :get-title="(profile: PublicProfile) => profile.publicName"
        :get-image="getProfileImage"
        :is-highlighted="(profile: PublicProfile) => matchedProfileIds.has(profile.id)"
        :popup-component="ProfileMapCard"
        class="h-100"
        @item:select="(id: string | number) => onProfileSelect(String(id))"
        @bounds-changed="debouncedOnBoundsChanged"
      />
    </template>
  </ProfileBrowseLayout>

  <BModal
    v-model="showTagCloud"
    centered
    :no-header="false"
    :no-footer="true"
    :title="t('profiles.browse.filters.explore_tags')"
    size="lg"
  >
    <TagCloud @tag:select="handleTagCloudSelect" />
  </BModal>
</template>
