<script setup lang="ts">
import { computed, onActivated, onMounted, provide, ref, toRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useProfilesViewModel } from '../composables/useProfilesViewModel'
import { useBrowseViewModel } from '../composables/useBrowseViewModel'
import { useDetailRouteState } from '@/features/shared/composables/useDetailRouteState'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'

import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import OsmPoiMap from '@/features/shared/components/osmPoiMap/OsmPoiMap.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import PublicProfileView from '@/features/publicprofile/components/PublicProfileView.vue'

import ProfileMarker from '@/features/publicprofile/components/ProfileMarker.vue'
import MapIcon from '@/features/posts/components/MapIcon.vue'

import PostsSidebar from '../components/PostsSidebar.vue'
import PostMapPopup from '@/features/posts/components/PostMapPopup.vue'
import PostFullView from '@/features/posts/components/PostFullView.vue'
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
const panel = useDetailPanel()

// Sync activePoi with route for map visual state + post detail panel source data
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

// Drive the global detail panel from the route. The panel is owned by
// DetailPanelOrchestrator in AuthLayout — we just push content into it.
// Watching both `detail` and `activePoi` ensures we wait for post data to
// load before opening (PostFullView needs activePoi.source).
watch(
  [detail, activePoi],
  ([d, poi]) => {
    if (!d) {
      panel.close()
      return
    }
    if (d.type === 'profile') {
      panel.show(PublicProfileView, { profileId: d.id })
    } else if (d.type === 'post' && poi) {
      panel.show(PostFullView, { post: poi.source as PublicPostWithProfile })
    }
  },
  { immediate: true }
)

// User dismissed the panel via its close button / ESC / backdrop while a
// detail route is still active → sync the route back to Browse so the URL
// reflects the closed state. The watch above will then no-op (detail is null).
watch(
  () => panel.isOpen.value,
  (open) => {
    if (!open && detail.value) {
      router.replace({ name: 'Browse' })
    }
  }
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
  <Teleport
    defer
    to="#app-sidebar"
  >
    <PostsSidebar
      :posts="filteredPostPois"
      :active-id="activePostId"
      @select="onSidebarSelect"
    />
  </Teleport>

  <!-- Detail panel content is pushed into DetailPanelOrchestrator (AuthLayout)
       imperatively via useDetailPanel() — see watcher above. -->

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
          :icon-resolver="(poi) => (poi.type === 'post' ? MapIcon : ProfileMarker)"
          :center="mapCenter"
          :popup-resolver="(poi) => (poi.type === 'post' ? PostMapPopup : ProfileMapCard)"
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
