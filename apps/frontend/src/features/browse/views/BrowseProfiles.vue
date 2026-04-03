<script setup lang="ts">
import { computed, onActivated, onMounted, provide, toRef, type Component } from 'vue'

import { useSocialMatchViewModel } from '../composables/useSocialMatchViewModel'
import { useBrowseViewModel } from '../composables/useBrowseViewModel'
import { isValidLatLng } from '@/features/shared/components/osmPoiMap/mapUtils'

import BrowseLayout from '@/features/shared/components/BrowseLayout.vue'
import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import MapIcon from '@/features/publicprofile/components/MapIcon.vue'
import PostMarkerIcon from '../components/PostMarkerIcon.vue'
import type {
  MapPoi,
  MapCluster,
  BoundsWithZoom,
} from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'
import type { ClusterFeature, PointFeature } from '@shared/zod/map/cluster.dto'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'

defineOptions({ name: 'BrowseProfiles' })

// ── Profile layer (existing cluster pipeline) ──────────────────────
const {
  viewerProfile,
  isNoOneAround,
  isLoading: isLoadingProfiles,
  clusterFeatures,
  matchFilter,
  isInitialized,
  updatePrefs,
  openProfile,
  onBoundsChanged: onProfileBoundsChanged,
  initialize,
  refreshIfFilterChanged,
} = useSocialMatchViewModel()

provide('viewerProfile', toRef(viewerProfile))

const findProfileStore = useFindProfileStore()

// ── Post layer + tags (new unified endpoint) ───────────────────────
const { filteredPostPois, availableTags, selectedTagIds, isLoadingPosts, fetchPostsAndTags } =
  useBrowseViewModel()

// ── Unified bounds handler ──────────────────────────────────────────
async function onBoundsChanged(payload: BoundsWithZoom) {
  // Fire both in parallel: profile clusters + post/tag fetch
  await Promise.all([onProfileBoundsChanged(payload), fetchPostsAndTags(payload.bounds)])
}

// ── Combined loading state ──────────────────────────────────────────
const isLoading = computed(() => isLoadingProfiles.value || isLoadingPosts.value)

// ── Map data: profile clusters + flat post POIs ─────────────────────
const clusters = computed<MapCluster[]>(() =>
  clusterFeatures.value
    .filter((f): f is ClusterFeature => f.type === 'cluster')
    .map((f) => ({
      id: f.id,
      location: { lat: f.lat, lon: f.lon },
      count: f.count,
      expansionZoom: f.expansionZoom,
    }))
)

const profilePois = computed<MapPoi[]>(() =>
  clusterFeatures.value
    .filter((f): f is PointFeature => f.type === 'point')
    .map((p) => ({
      id: p.id,
      title: p.publicName,
      location: { lat: p.lat, lon: p.lon },
      image: p.image?.url
        ? { blurhash: p.image.blurhash, variants: [{ size: 'thumb', url: p.image.url }] }
        : undefined,
      highlighted: p.highlighted,
      type: 'profile',
      source: p,
    }))
)

const allPois = computed<MapPoi[]>(() => [...profilePois.value, ...filteredPostPois.value])

// ── Icon resolver: profile → MapIcon, post → PostMarkerIcon ────────
function iconResolver(poi: MapPoi): Component {
  return poi.type === 'post' ? PostMarkerIcon : MapIcon
}

const fetchPopupData = async (id: string | number) => {
  return findProfileStore.fetchProfileForPopup(String(id))
}

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

onMounted(async () => {
  await initialize()
})

onActivated(async () => {
  if (isInitialized.value) {
    await refreshIfFilterChanged()
  }
})
</script>

<template>
  <BrowseLayout>
    <template #filter-bar>
      <BrowseFilterBar
        v-model="matchFilter"
        :viewer-profile="viewerProfile"
        :available-tags="availableTags"
        :selected-tag-ids="selectedTagIds"
        @filter:changed="updatePrefs"
        @update:selected-tag-ids="selectedTagIds = $event"
      />
    </template>

    <template #results>
      <BAlert
        v-if="isNoOneAround"
        variant="info"
        class="lonely-alert shadow p-2 p-md-2"
        show
      >
        <NoResultsCTA />
      </BAlert>
      <MapView
        :items="allPois"
        :clusters="clusters"
        :icon-component="MapIcon"
        :icon-resolver="iconResolver"
        :center="mapCenter"
        :is-loading="isLoading"
        :is-placeholder-animated="true"
        :popup-component="ProfileMapCard"
        :fetch-popup-data="fetchPopupData"
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
