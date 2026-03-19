<script setup lang="ts">
import { computed, onActivated, onMounted, provide, toRef } from 'vue'

import BrowseLayout from '@/features/shared/components/BrowseLayout.vue'
import { isValidLatLng } from '@/features/shared/components/osmPoiMap/mapUtils'
import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import MapIcon from '@/features/publicprofile/components/MapIcon.vue'
import { useSocialMatchViewModel } from '../composables/useSocialMatchViewModel'
import type { MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'

defineOptions({ name: 'BrowseProfiles' })

const {
  viewerProfile,
  haveResults,
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

onActivated(() => {
  if (isInitialized.value) {
    refreshIfFilterChanged()
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
  <BrowseLayout
    :isLoading="isLoading"
    :isInitialized="isInitialized"
    :haveResults="haveResults"
  >
    <template #filter-bar>
      <BrowseFilterBar
        v-model="matchFilter"
        :viewer-profile="viewerProfile"
        @filter:changed="updatePrefs"
      />
    </template>

    <template #results>
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
