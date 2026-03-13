<script setup lang="ts">
import { computed, onMounted, provide, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'

import BrowseLayout from '@/features/shared/components/BrowseLayout.vue'
import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import MapIcon from '@/features/publicprofile/components/MapIcon.vue'
import TagCloud from '@/features/shared/components/TagCloud.vue'

import { useSocialMatchViewModel } from '../composables/useSocialMatchViewModel'
import type { PopularTag } from '@zod/tag/tag.dto'
import type { MapPoi } from '@/features/shared/components/OsmPoiMap.types'

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
        :items="mapPois"
        :icon-component="MapIcon"
        :center="mapCenter"
        :is-loading="isLoading"
        :is-placeholder-animated="true"
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
