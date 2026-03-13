<script setup lang="ts">
import { computed, onMounted, provide, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'

import BrowseLayout from '@/features/shared/components/BrowseLayout.vue'
import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import TagCloud from '@/features/shared/components/TagCloud.vue'

import { useSocialMatchViewModel } from '../composables/useSocialMatchViewModel'
import type { PublicProfile } from '@zod/profile/profile.dto'
import type { PopularTag } from '@zod/tag/tag.dto'

defineOptions({ name: 'BrowseProfiles' })

const { t } = useI18n()

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
} = useSocialMatchViewModel()

provide('viewerProfile', toRef(viewerProfile))

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

const mapCenter = computed<[number, number] | undefined>(() => {
  const loc = matchFilter.value?.location
  if (loc?.lat && loc?.lon) return [loc.lat, loc.lon]
  const profile = viewerProfile.value?.location
  if (profile?.lat && profile?.lon) return [profile.lat, profile.lon]
  return undefined
})

const showTagCloud = ref(false)

function handleTagCloudSelect(tag: PopularTag) {
  if (!matchFilter.value) return
  const exists = matchFilter.value.tags.some((t) => t.id === tag.id)
  if (!exists) {
    matchFilter.value.tags = [
      ...matchFilter.value.tags,
      { id: tag.id, name: tag.name, slug: tag.slug },
    ]
  }
  showTagCloud.value = false
  updatePrefs()
}
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
        @tagcloud:open="showTagCloud = true"
      />
    </template>

    <template #results>
      <MapView
        :items="profileList"
        :center="mapCenter"
        :is-loading="isLoading"
        :is-placeholder-animated="true"
        :get-location="
          (profile: PublicProfile) =>
            profile.location.lat != null && profile.location.lon != null
              ? { lat: profile.location.lat, lon: profile.location.lon }
              : undefined
        "
        :get-title="(profile: PublicProfile) => profile.publicName"
        :get-image="getProfileImage"
        :is-highlighted="(profile: PublicProfile) => matchedProfileIds.has(profile.id)"
        :popup-component="ProfileMapCard"
        class="h-100"
        @item:select="(id: string | number) => openProfile(String(id))"
        @bounds-changed="debouncedOnBoundsChanged"
      />
    </template>
  </BrowseLayout>

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
