<script setup lang="ts">
import { computed, onActivated, onMounted, provide, toRef } from 'vue'

import { useSocialMatchViewModel } from '../composables/useSocialMatchViewModel'
import { isValidLatLng } from '@/features/shared/components/osmPoiMap/mapUtils'

import BrowseLayout from '@/features/shared/components/BrowseLayout.vue'
import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import MapIcon from '@/features/publicprofile/components/MapIcon.vue'
import type { MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'

defineOptions({ name: 'BrowseProfiles' })

const {
  viewerProfile,
  haveResults,
  isNoOneAround,
  isLoading,
  profileList,
  matchedProfileIds,
  matchFilter,
  isInitialized,
  updatePrefs,
  openProfile,
  onBoundsChanged,
  initialize,
  refreshIfFilterChanged,
} = useSocialMatchViewModel()

provide('viewerProfile', toRef(viewerProfile))

onMounted(async () => {
  await initialize()
})

onActivated(async () => {
  if (isInitialized.value) {
    await refreshIfFilterChanged()
  }
})

const mapPois = computed<MapPoi[]>(() =>
  profileList.value
    .filter((p) => p.location?.lat != null && p.location?.lon != null)
    .map((p) => ({
      id: p.id,
      title: p.publicName,
      location: { lat: p.location.lat!, lon: p.location.lon! },
      image: p.profileImages?.[0],
      highlighted: matchedProfileIds.value.has(p.id),
      source: p,
    }))
)

const mapCenter = computed<[number, number] | undefined>(() => {
  const loc = matchFilter.value?.location
  const locPair: [number, number] | undefined =
    loc?.lat != null && loc?.lon != null ? [loc.lat, loc.lon] : undefined
  if (isValidLatLng(locPair)) return locPair

  const profile = viewerProfile.value?.location
  const profilePair: [number, number] | undefined =
    profile?.lat != null && profile?.lon != null ? [profile.lat, profile.lon] : undefined
  if (isValidLatLng(profilePair)) return profilePair

  return undefined
})
</script>

<template>
  <BrowseLayout>
    <template #filter-bar>
      <BrowseFilterBar
        v-model="matchFilter"
        :viewer-profile="viewerProfile"
        @filter:changed="updatePrefs"
      />
    </template>

    <template #results>
      <BAlert
        v-if="!isNoOneAround"
        variant="info"
        class="lonely-alert shadow p-2 p-md-2"
        show
      >
        <NoResultsCTA />
      </BAlert>
      <MapView
        :items="mapPois"
        :icon-component="MapIcon"
        :center="mapCenter"
        :is-loading="isLoading"
        :is-placeholder-animated="true"
        :popup-component="ProfileMapCard"
        class="h-100"
        @item:select="(id: string | number) => openProfile(String(id))"
        @bounds-changed="onBoundsChanged"
      />
    </template>
  </BrowseLayout>
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';
@import '@/css/theme.scss';

.lonely-alert {
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1025;
  background-color: rgba($color: $info, $alpha: 0.6);
  position: absolute;
  width: fit-content;
  min-width: 80%;
}
</style>
