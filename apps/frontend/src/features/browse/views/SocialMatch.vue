<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

import ProfileBrowseLayout from '../components/ProfileBrowseLayout.vue'
import ProfileCardGrid from '../components/ProfileCardGrid.vue'
import SocialFilterDisplay from '../components/SocialFilterDisplay.vue'
import SocialFilterForm from '../components/SocialFilterForm.vue'
import ViewModeToggler from '@/features/shared/ui/ViewModeToggler.vue'
import OsmPoiMap from '@/features/shared/components/OsmPoiMap.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import FluidColumn from '@/features/shared/ui/FluidColumn.vue'

import { useSocialMatchViewModel } from '../composables/useSocialMatchViewModel'
import { useCountries } from '../../shared/composables/useCountries'
import type { PublicProfile } from '@zod/profile/profile.dto'

const { t } = useI18n()

const {
  viewerProfile,
  haveAccess,
  haveResults,
  isLoading,
  isLoadingMore,
  hasMoreProfiles,
  profileList,
  selectedProfileId,
  socialFilter,
  viewModeModel,
  isInitialized,
  hideProfile,
  updatePrefs,
  openProfile,
  closeProfile,
  initialize,
  reset,
  loadMoreProfiles,
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
</script>

<template>
  <ProfileBrowseLayout
    :viewerProfile="viewerProfile"
    :profileList="profileList"
    :selectedProfileId="selectedProfileId"
    :isLoading="isLoading"
    :isLoadingMore="isLoadingMore"
    :isInitialized="isInitialized"
    :hasMoreProfiles="hasMoreProfiles"
    :haveAccess="haveAccess"
    :haveResults="haveResults"
    currentScope="social"
    @load-more="loadMoreProfiles"
    @profile:open="openProfile"
    @profile:close="closeProfile"
    @profile:hidden="hideProfile"
    @prefs:update="updatePrefs"
  >
    <template #no-results>
      <div class="mb-3">
        {{ t('profiles.browse.social_no_results', { country: countryName }) }}
      </div>
    </template>

    <template #filter-bar>
      <div class="filter-area flex-grow-1">
        <SocialFilterDisplay
          v-if="socialFilter && haveAccess"
          v-model="socialFilter"
          :viewerLocation="viewerProfile?.location"
          @filter:changed="updatePrefs"
        />
      </div>

      <ViewModeToggler
        v-model="viewModeModel"
        @click.stop
      />
    </template>

    <template #results="{ onProfileSelect }">
      <FluidColumn
        v-if="viewModeModel === 'grid'"
        class="grid-view"
      >
        <ProfileCardGrid
          :profiles="profileList"
          :showTags="true"
          :showLocation="true"
          @profile:select="onProfileSelect"
        />
      </FluidColumn>
      <OsmPoiMap
        v-if="viewModeModel === 'map'"
        :items="profileList"
        :get-location="(profile: PublicProfile) => profile.location"
        :get-title="(profile: PublicProfile) => profile.publicName"
        :get-image-url="getProfileImageUrl"
        :popup-component="ProfileMapCard"
        class="map-view h-100"
        @item:select="(id: string | number) => onProfileSelect(String(id))"
      />
    </template>

    <template #prefs-modal>
      <SocialFilterForm
        v-model="socialFilter"
        :viewerProfile="viewerProfile"
        v-if="socialFilter"
      />
    </template>
  </ProfileBrowseLayout>
</template>
