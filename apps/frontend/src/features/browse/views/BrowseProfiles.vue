<script setup lang="ts">
import { onActivated, onMounted, provide, ref, toRef, type Component } from 'vue'
import { useRoute } from 'vue-router'

import { useProfilesViewModel } from '../composables/useProfilesViewModel'
import { useBrowseViewModel } from '../composables/useBrowseViewModel'
import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'

import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import MapIcon from '@/features/publicprofile/components/MapIcon.vue'
import PostMarkerIcon from '../components/PostMarkerIcon.vue'
import PostsSidebar from '../components/PostsSidebar.vue'
import BrowseOffcanvas from '../components/BrowseOffcanvas.vue'
import OwnerDrawer from '@/features/app/components/OwnerDrawer.vue'
import OwnerDrawerControls from '../components/OwnerDrawerControls.vue'
import type { MapPoi, BoundsWithZoom } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'

defineOptions({ name: 'BrowseProfiles' })

// ── Profile layer (existing cluster pipeline) ──────────────────────
const {
  viewerProfile,
  isNoOneAround,
  clusterFeatures,
  matchFilter,
  isInitialized,
  updatePrefs,
  openProfile,
  onBoundsChanged: onProfileBoundsChanged,
  initialize,
  refreshIfFilterChanged,
  mapCenter,
  fetchPopupData,
} = useProfilesViewModel()

provide('viewerProfile', toRef(viewerProfile))

const route = useRoute()
// ── Post layer + tags + merged map data ────────────────────────────
const { filteredPostPois, clusters, allPois, availableTags, selectedTagIds, fetchPostsAndTags } =
  useBrowseViewModel(clusterFeatures)

// ── Offcanvas state ─────────────────────────────────────────────────
const offcanvasState = useOffcanvasState()
const activePoi = ref<MapPoi | null>(null)
const activePostId = ref<string | number | null>(null)
const mapRef = ref<InstanceType<typeof MapView> | null>(null)

// ── User offcanvas (profile + inbox) ────────────────────────────────
const ownerDrawerPanel = ref<'profile' | 'inbox'>('profile')
const initialConversationId = ref<string | undefined>()

function openProfileDrawer() {
  ownerDrawerPanel.value = 'profile'
  offcanvasState.open('user')
}

function openInboxDrawer(conversationId?: string) {
  ownerDrawerPanel.value = 'inbox'
  initialConversationId.value = conversationId
  offcanvasState.open('user')
}

function onMarkerClick(id: string | number) {
  const poi = allPois.value.find((p) => p.id === id)
  if (!poi) return
  activePoi.value = poi
  if (poi.type === 'post') activePostId.value = poi.id
}

function onSidebarSelect(poi: MapPoi) {
  activePostId.value = poi.id
  activePoi.value = poi
  mapRef.value?.flyToMarker(poi)
}

function onOffcanvasClose() {
  activePoi.value = null
  activePostId.value = null
}

function onViewProfile(profileId: string) {
  openProfile(profileId)
}

// ── Unified bounds handler ──────────────────────────────────────────
async function onBoundsChanged(boundsWithZoom: BoundsWithZoom) {
  await Promise.all([
    onProfileBoundsChanged(boundsWithZoom),
    fetchPostsAndTags(boundsWithZoom.bounds),
  ])
}

function iconResolver(poi: MapPoi): Component {
  return poi.type === 'post' ? PostMarkerIcon : MapIcon
}

onMounted(async () => {
  await initialize()

  // Deep-link support: ?panel=profile|inbox&conversation=<id>
  const panel = route.query.panel as 'profile' | 'inbox' | undefined
  const convoId = route.query.conversation as string | undefined
  if (panel === 'profile') openProfileDrawer()
  else if (panel === 'inbox') openInboxDrawer(convoId)
})

onActivated(async () => {
  if (isInitialized.value) {
    await refreshIfFilterChanged()
  }
})
</script>

<template>
  <div class="browse-shell d-flex vh-100 overflow-hidden">
    <!-- Posts sidebar (desktop only) -->
    <PostsSidebar
      :posts="filteredPostPois"
      :active-id="activePostId"
      @select="onSidebarSelect"
    />

    <!-- Browse detail panel (between sidebar and map, per wireframe) -->
    <BrowseOffcanvas
      :active-poi="activePoi"
      @close="onOffcanvasClose"
      @view-profile="onViewProfile"
    />

    <!-- Map region -->
    <div class="map-region flex-grow-1 position-relative overflow-hidden">
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
          <MapView
            ref="mapRef"
            :items="allPois"
            :clusters="clusters"
            :icon-component="MapIcon"
            :icon-resolver="iconResolver"
            :highlighted-poi-id="activePoi?.id ?? null"
            :center="mapCenter"
            :is-placeholder-animated="true"
            :popup-component="ProfileMapCard"
            :fetch-popup-data="fetchPopupData"
            class="h-100"
            @item:select="onMarkerClick"
            @bounds-changed="onBoundsChanged"
          />
        </div>
      </main>
    </div>

    <!-- User offcanvas (Profile + Inbox panels) -->
    <OwnerDrawer
      :panel="ownerDrawerPanel"
      :conversation-id="initialConversationId"
      @profile:open="onViewProfile"
    />
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

.subnav-bar {
  position: relative;
  z-index: 1030;
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
