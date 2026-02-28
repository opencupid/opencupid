<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'

import ProfileBrowseLayout from '../components/ProfileBrowseLayout.vue'
import OsmPoiMap from '@/features/shared/components/OsmPoiMap.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import LocationSelector from '@/features/shared/profileform/LocationSelector.vue'
import TagSelector from '@/features/shared/profileform/TagSelector.vue'
import TagCloud from '@/features/shared/components/TagCloud.vue'
import IconTarget2 from '@/assets/icons/interface/target-2.svg'
import IconTag  from '@/assets/icons/e-commerce/tag.svg'

import { useSocialMatchViewModel } from '../composables/useSocialMatchViewModel'
import { useCountries } from '../../shared/composables/useCountries'
import type { PublicProfile } from '@zod/profile/profile.dto'
import type { PopularTag } from '@zod/tag/tag.dto'

const { t } = useI18n()

const {
  viewerProfile,
  haveAccess,
  haveResults,
  isLoading,
  profileList,
  selectedProfileId,
  socialFilter,
  isInitialized,
  hideProfile,
  updatePrefs,
  openProfile,
  closeProfile,
  initialize,
  reset,
} = useSocialMatchViewModel()

onMounted(async () => {
  await initialize()
})

onUnmounted(() => {
  reset()
})

const { countryCodeToName } = useCountries()

const countryName = computed(() => {
  const country = socialFilter.value?.location.country
  if (!country) return ''
  return countryCodeToName(country)
})

const getProfileImageUrl = (profile: PublicProfile) => {
  const variants = profile.profileImages?.[0]?.variants
  return variants?.find((v) => v.size === 'thumb')?.url
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
    :selectedProfileId="selectedProfileId"
    :isLoading="isLoading"
    :isInitialized="isInitialized"
    :haveAccess="haveAccess"
    :haveResults="haveResults"
    currentScope="social"
    @profile:open="openProfile"
    @profile:close="closeProfile"
    @profile:hidden="hideProfile"
  >
    <template #no-results>
      <div class="mb-3">
        {{ t('profiles.browse.social_no_results', { country: countryName }) }}
      </div>
    </template>

    <template #filter-bar>
      <div
        class="filter-area flex-grow-1"
        @click.stop
      >
        <div
          class="row g-2"
          v-if="socialFilter && haveAccess"
        >
          <!-- Location column -->
          <div class="col-12 col-md-6">
            <div class="d-flex align-items-center gap-2">
             
              <div class="flex-grow-1">
                <LocationSelector
                  v-model="socialFilter.location"
                  open-direction="bottom"
                  :allowEmpty="true"
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
      <OsmPoiMap
        :items="profileList"
        :center="mapCenter"
        :get-location="(profile: PublicProfile) => profile.location"
        :get-title="(profile: PublicProfile) => profile.publicName"
        :get-image-url="getProfileImageUrl"
        :popup-component="ProfileMapCard"
        class="map-view h-100"
        @item:select="(id: string | number) => onProfileSelect(String(id))"
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
