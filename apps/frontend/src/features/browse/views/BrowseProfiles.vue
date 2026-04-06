<script setup lang="ts">
import { computed, onActivated, onMounted, provide, ref, toRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useProfilesViewModel } from '../composables/useProfilesViewModel'
import { useBrowseViewModel } from '../composables/useBrowseViewModel'
import { useDetailRouteState } from '@/features/shared/composables/useDetailRouteState'

import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import OsmPoiMap from '@/features/shared/components/osmPoiMap/OsmPoiMap.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import PublicProfileView from '@/features/publicprofile/components/PublicProfileView.vue'

import ProfileMarker from '@/features/publicprofile/components/ProfileMarker.vue'
import PostMarker from '@/features/posts/components/PostMarker.vue'

import PostsSidebar from '../components/PostsSidebar.vue'
import DetailContainer from '../components/DetailContainer.vue'
import PostMapPopup from '@/features/posts/components/PostMapPopup.vue'
import OwnerDrawerControls from '../components/OwnerDrawerControls.vue'
import type { MapPoi } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'
import type { PublicPostWithProfile } from '@zod/post/post.dto'

// Component name must be 'AppShell' for KeepAlive to identify it correctly
defineOptions({ name: 'AppShell' })

// ── Profile layer (existing cluster pipeline) ──────────────────────
const {
  viewerProfile,
  isNoOneAround,
  clusterFeatures,
  matchFilter,
  isInitialized,
  updatePrefs,
  onBoundsChanged: onProfileBoundsChanged,
  initialize,
  refreshIfFilterChanged,
  mapCenter,
  fetchPopupData,
} = useProfilesViewModel()

provide('viewerProfile', toRef(viewerProfile))

// ── Post layer + tags + merged map data + selection state ──────────
const {
  filteredPostPois,
  clusters,
  allPois,
  availableTags,
  selectedTagIds,
  activePoi,
  onSelectionClear,
  onBoundsChanged,
} = useBrowseViewModel(clusterFeatures, onProfileBoundsChanged)

// ── Route-driven detail panel ──────────────────────────────────────
const route = useRoute()
const router = useRouter()
const ownerProfileStore = useOwnerProfileStore()
const mapRef = ref<InstanceType<typeof OsmPoiMap> | null>(null)

const { detail } = useDetailRouteState()

// Sync activePoi with route for map visual state + PostMapPopup source data
watch(
  detail,
  (d) => {
    if (!d) {
      onSelectionClear()
      return
    }
    const found = allPois.value.find((p) => String(p.id) === d.id)
    activePoi.value = found ?? null
  },
  { immediate: true }
)

// activePostId: drives PostsSidebar highlight
const activePostId = computed(() => (detail.value?.type === 'post' ? detail.value.id : null))

// ── Navigation helpers ─────────────────────────────────────────────
function openProfileDrawer() {
  router.push({ name: 'Me' })
}

function openInboxDrawer() {
  router.push({ name: 'Inbox' })
}

// Route-aware marker selection: profiles and posts go to route
function handleMarkerSelect(id: string | number) {
  const poi = allPois.value.find((p) => p.id === id)
  if (!poi) return
  if (poi.type === 'post') {
    router.push({ name: 'PublicPost', params: { postId: String(id) } })
  } else {
    router.push({ name: 'PublicProfile', params: { profileId: String(id) } })
  }
}

function onSidebarSelect(poi: MapPoi) {
  router.push({ name: 'PublicPost', params: { postId: String(poi.id) } })
  mapRef.value?.flyToMarker(poi)
}

function onDetailClose() {
  router.replace({ name: 'Browse' })
}

// ── Lifecycle ──────────────────────────────────────────────────────
onMounted(async () => {
  await useBootstrap().bootstrap()
  if (!ownerProfileStore.profile?.isOnboarded) {
    router.push({ name: 'Onboarding' })
    return
  }
  await initialize()
})

onActivated(async () => {
  if (!isInitialized.value) {
    await initialize()
  } else {
    await refreshIfFilterChanged()
  }
})
</script>

<template>
  <!-- Sidebar teleported into AuthLayout's #app-sidebar slot -->
  <Teleport defer to="#app-sidebar">
    <PostsSidebar
      :posts="filteredPostPois"
      :active-id="activePostId"
      @select="onSidebarSelect"
    />
  </Teleport>

  <!-- Detail panel teleported into AuthLayout's #app-detail slot -->
  <Teleport defer to="#app-detail">
    <DetailContainer
      :open="!!detail"
      @close="onDetailClose"
    >
      <template #header>{{ detail?.type === 'post' ? 'Post' : activePoi?.title }}</template>
      <PostMapPopup
        v-if="detail?.type === 'post' && activePoi"
        :item="activePoi.source as PublicPostWithProfile"
      />
      <PublicProfileView
        v-else-if="detail?.type === 'profile'"
        :profile-id="detail.id"
      />
    </DetailContainer>
  </Teleport>

  <!-- Map region (only content that stays in-place) -->
  <div class="map-region h-100 position-relative overflow-hidden">
    <div
      class="position-absolute w-100 top-0 end-0 d-flex align-items-center justify-content-end gap-2 p-2"
      style="z-index: 1010"
    >
      <div class="flex-grow-1">
        <BrowseFilterBar
          v-model="matchFilter"
          :viewer-profile="viewerProfile"
          :available-tags="availableTags"
          :selected-tag-ids="selectedTagIds"
          @filter:changed="updatePrefs"
          @update:selected-tag-ids="selectedTagIds = $event"
        />
      </div>
      <div class="flex-shrink-0 flex-grow-0">
        <OwnerDrawerControls
          @open:inbox="openInboxDrawer()"
          @open:profile="openProfileDrawer()"
        />
      </div>
    </div>
    <main class="list-view d-flex flex-column justify-content-start">
      <div class="overflow-auto hide-scrollbar flex-grow-1 position-relative">
        <BAlert
          v-if="isNoOneAround"
          variant="info"
          class="lonely-alert shadow p-2 p-md-2"
          show
        >
          <NoResultsCTA />
        </BAlert>
        <OsmPoiMap
          ref="mapRef"
          :items="allPois"
          :clusters="clusters"
          :icon-resolver="(poi) => poi.type === 'post' ? PostMarker : ProfileMarker"
          :center="mapCenter"
          :popup-component="ProfileMapCard"
          :fetch-popup-data="fetchPopupData"
          class="h-100"
          @item:select="handleMarkerSelect"
          @bounds:changed="onBoundsChanged"
        />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';
@import '@/css/app-vars.scss';
@import '@/css/theme.scss';

.list-view {
  height: 100vh;
}

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
