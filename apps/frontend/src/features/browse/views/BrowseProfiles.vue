<script setup lang="ts">
import { computed, onActivated, onMounted, provide, ref, toRef, type Component } from 'vue'
import { useRoute } from 'vue-router'

import { useSocialMatchViewModel } from '../composables/useSocialMatchViewModel'
import { useBrowseViewModel } from '../composables/useBrowseViewModel'
import { useOffcanvasState } from '@/features/shared/composables/useOffcanvasState'
import { useNotificationState } from '@/features/app/composables/useNotificationState'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { isValidLatLng } from '@/features/shared/components/osmPoiMap/mapUtils'

import BrowseLayout from '@/features/shared/components/BrowseLayout.vue'
import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import MapView from '@/features/shared/components/MapView.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import MapIcon from '@/features/publicprofile/components/MapIcon.vue'
import PostMarkerIcon from '../components/PostMarkerIcon.vue'
import PostsSidebar from '../components/PostsSidebar.vue'
import BrowseOffcanvas from '../components/BrowseOffcanvas.vue'
import UserOffcanvas from '@/features/app/components/UserOffcanvas.vue'
import ProfileImage from '@/features/images/components/ProfileImage.vue'
import NotificationDot from '@/features/shared/ui/NotificationDot.vue'
import IconMessage from '@/assets/icons/interface/message.svg'
import IconUser from '@/assets/icons/interface/user.svg'
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

const route = useRoute()
const findProfileStore = useFindProfileStore()
const ownerProfileStore = useOwnerProfileStore()
const { hasUnreadMessages, hasMatchNotifications } = useNotificationState()

// ── Post layer + tags (new unified endpoint) ───────────────────────
const { filteredPostPois, availableTags, selectedTagIds, isLoadingPosts, fetchPostsAndTags } =
  useBrowseViewModel()

// ── Offcanvas state ─────────────────────────────────────────────────
const offcanvasState = useOffcanvasState()
const activePoi = ref<MapPoi | null>(null)
const activePostId = ref<string | number | null>(null)
const mapRef = ref<InstanceType<typeof MapView> | null>(null)

// ── User offcanvas (profile + inbox) ────────────────────────────────
const userOffcanvasPanel = ref<'profile' | 'inbox'>('profile')
const initialConversationId = ref<string | undefined>()

function openUserOffcanvas(panel: 'profile' | 'inbox', conversationId?: string) {
  userOffcanvasPanel.value = panel
  initialConversationId.value = conversationId
  offcanvasState.open('user')
}

function onMarkerClick(id: string | number) {
  const poi = allPois.value.find((p) => p.id === id)
  if (!poi) {
    openProfile(String(id))
    return
  }
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
async function onBoundsChanged(payload: BoundsWithZoom) {
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

  // Deep-link support: ?panel=profile|inbox&conversation=<id>
  const panel = route.query.panel as 'profile' | 'inbox' | undefined
  const convoId = route.query.conversation as string | undefined
  if (panel === 'profile' || panel === 'inbox') {
    openUserOffcanvas(panel, convoId)
  }
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

    <!-- Map region -->
    <div class="map-region flex-grow-1 position-relative overflow-hidden">
      <!-- Map overlay: user controls (top-right) -->
      <div
        class="map-overlay-controls position-absolute top-0 end-0 p-2 d-flex gap-2"
        style="z-index: 1010"
      >
        <button
          type="button"
          class="btn btn-light btn-sm rounded-circle shadow-sm p-0 overflow-hidden"
          style="width: 2.5rem; height: 2.5rem"
          :aria-label="$t('nav.inbox')"
          @click="openUserOffcanvas('inbox')"
        >
          <NotificationDot :show="hasUnreadMessages || hasMatchNotifications">
            <IconMessage class="svg-icon" />
          </NotificationDot>
        </button>
        <button
          type="button"
          class="btn btn-light btn-sm rounded-circle shadow-sm p-0 overflow-hidden"
          style="width: 2.5rem; height: 2.5rem"
          :aria-label="$t('nav.profile')"
          @click="openUserOffcanvas('profile')"
        >
          <ProfileImage
            v-if="ownerProfileStore.profile?.profileImages?.length"
            :profile="ownerProfileStore.profile"
            variant="thumb"
            class="img-fluid w-100 h-100"
          />
          <IconUser
            v-else
            class="svg-icon"
          />
        </button>
      </div>

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
            ref="mapRef"
            :items="allPois"
            :clusters="clusters"
            :icon-component="MapIcon"
            :icon-resolver="iconResolver"
            :highlighted-poi-id="activePostId"
            :center="mapCenter"
            :is-loading="isLoading"
            :is-placeholder-animated="true"
            :popup-component="ProfileMapCard"
            :fetch-popup-data="fetchPopupData"
            class="h-100"
            @item:select="onMarkerClick"
            @bounds-changed="onBoundsChanged"
          />
        </template>
      </BrowseLayout>
    </div>

    <!-- Browse offcanvas (profile or post detail) -->
    <BrowseOffcanvas
      :active-poi="activePoi"
      @close="onOffcanvasClose"
      @view-profile="onViewProfile"
    />

    <!-- User offcanvas (Profile + Inbox panels) -->
    <UserOffcanvas
      :panel="userOffcanvasPanel"
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
