<script setup lang="ts">
import { computed, onActivated, onMounted, provide, ref, toRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n'
import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useBrowseViewModel } from '../composables/useBrowseViewModel'
import { useSearchStore } from '@/features/browse/stores/searchStore'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { isValidLatLng, toLatLng } from '@/features/map/utils/mapUtils'
import { MAP_DEFAULT_CENTER } from '@shared/maps'
import { useDetailRouteState } from '@/features/shared/composables/useDetailRouteState'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'

import OsmPoiMap from '@/features/map/components/OsmPoiMap.vue'
import MapLayerControl from '@/features/map/components/MapLayerControl.vue'
import MapPlaceholder from '@/features/shared/components/MapPlaceholder.vue'
import SearchBar from '../components/SearchBar.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import PublicProfileView from '@/features/publicprofile/components/PublicProfileView.vue'

import { renderProfileMarkerHtml } from '@/features/publicprofile/components/profileMarkerIcon'
import { renderPostMapIconHtml } from '@/features/posts/components/postMapIcon'
import { renderEventMapIconHtml } from '@/features/events/components/eventMapIcon'
import { renderCommunityMapIconHtml } from '@/features/community/components/communityMapIcon'

import PostMapPopup from '@/features/posts/components/PostMapPopup.vue'
import EventMapPopup from '@/features/events/components/EventMapPopup.vue'
import EventFullView from '@/features/events/components/EventFullView.vue'
import CommunityMapPopup from '@/features/community/components/CommunityMapPopup.vue'
import CommunityFullView from '@/features/community/components/CommunityFullView.vue'

import type { MapPoi } from '@/features/map/types/map.types'
import PostFullView from '@/features/posts/components/PostFullView.vue'
import OwnerDrawerControls from '../components/OwnerDrawerControls.vue'
import NearbyFeatures from '../components/NearbyFeatures.vue'
import { useUserContentStore } from '@/features/userContent/stores/userContentStore'
import { toGeoPoint, type GeoPoint } from '@zod/dto/location.dto'
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'
import InviteCtaShareDialog from '@/features/app/components/InviteCtaShareDialog.vue'
import type { SharePayload } from '@/features/app/components/ShareSheet.vue'

// Component name must be 'AppShell' for KeepAlive to identify it correctly
defineOptions({ name: 'AppShell' })

// ── View model ────────────────────────────────────────────────────
const {
  viewerProfile,
  isNoOneAround,
  clusters,
  allPois,
  availableTags,
  activePoi,
  onSelectionClear,
  onBoundsChanged,
  fetchPopupData,
} = useBrowseViewModel()

const findProfileStore = useFindProfileStore()

// Ephemeral tag filter state (client-only). Changing it triggers a refetch
// of the current viewport so the map reflects the new filter immediately.
const searchStore = useSearchStore()
const { selectedTagIds } = storeToRefs(searchStore)
watch(selectedTagIds, () => {
  findProfileStore.refetchBounds()
})

// Server-side layer filtering: toggling a layer changes the `kinds` query
// param sent on cluster fetches. Invalidate the bounds cache and refetch.
const { selectedLayers } = storeToRefs(findProfileStore)
watch(selectedLayers, () => {
  findProfileStore.refetchBounds()
})

// Placeholder visibility. Flipped by @map:ready from OsmPoiMap once the
// first tile load completes. Hoisted out of OsmPoiMap so it paints from
// first render — i.e. before initialMapCenter resolves and the map mounts.
const isMapReady = ref(false)
function onMapReady() {
  isMapReady.value = true
}

// Initial center for the map's first mount. Read once by OsmPoiMap; not
// reactive after mount. Falls back to MAP_DEFAULT_CENTER when the viewer
// profile has no resolved coordinates so the map still mounts and renders.
const initialMapCenter = computed<[number, number]>(() => {
  const fromProfile = toLatLng(viewerProfile.value?.location)
  return isValidLatLng(fromProfile) ? fromProfile : MAP_DEFAULT_CENTER
})

const highlightedLocation = ref<[number, number] | null>(null)
function onLocationSet(point: GeoPoint) {
  highlightedLocation.value = [point.lat, point.lon]
}

// Per-kind dispatch for marker icons and popup components. The discriminator
// is `poi.kind` from the cluster service's PointFeature; profiles fall through
// the default branch.
const iconResolver = computed(() => (poi: MapPoi) => {
  if (poi.kind === 'post') return renderPostMapIconHtml
  if (poi.kind === 'event') return renderEventMapIconHtml
  if (poi.kind === 'community') return renderCommunityMapIconHtml
  return renderProfileMarkerHtml
})

const popupResolver = computed(() => (poi: MapPoi) => {
  if (poi.kind === 'post') return PostMapPopup
  if (poi.kind === 'event') return EventMapPopup
  if (poi.kind === 'community') return CommunityMapPopup
  return ProfileMapCard
})

provide('viewerProfile', toRef(viewerProfile))

// ── Route-driven detail panel ──────────────────────────────────────
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const ownerProfileStore = useOwnerProfileStore()
const contentStore = useUserContentStore()

const { detail } = useDetailRouteState()
const panel = useDetailPanel()

// Invite-CTA share payload — site-level, not content-specific.
const shareInvitePayload = computed<SharePayload>(() => ({
  title: t('uicomponents.share_dialog.share_title', { siteName: __APP_CONFIG__.SITE_NAME }),
  text: t('uicomponents.share_dialog.share_text', {
    siteName: __APP_CONFIG__.SITE_NAME,
    publicName: viewerProfile.value?.publicName || '',
  }),
  url: window.location.origin,
}))

// Sync activePoi with route for map visual state + post detail panel source data
watch(
  detail,
  (d) => {
    if (!d) {
      onSelectionClear()
      return
    }
    const found = allPois.value.find((p) => p.id === d.id)
    activePoi.value = found ?? null
  },
  { immediate: true }
)

// Drive the global detail panel from the route.
watch(
  detail,
  async (d) => {
    if (!d) {
      panel.close()
      return
    }
    if (d.type === 'profile') {
      panel.show(PublicProfileView, { profileId: d.id })
    } else if (d.type === 'post') {
      const result = await contentStore.fetchPublicPost(d.id)
      if (result.success && result.data) {
        panel.show(PostFullView, { post: result.data.post })
      } else {
        toast.error(t('posts.messages.error_load'))
        panel.close()
        router.replace({ name: 'Browse' })
      }
    } else if (d.type === 'event') {
      const result = await contentStore.fetchPublicEvent(d.id)
      if (result.success && result.data) {
        panel.show(EventFullView, { event: result.data.event })
      } else {
        toast.error(t('events.messages.error_load'))
        panel.close()
        router.replace({ name: 'Browse' })
      }
    } else if (d.type === 'community') {
      const result = await contentStore.fetchPublicCommunity(d.id)
      if (result.success && result.data) {
        panel.show(CommunityFullView, { community: result.data.community })
      } else {
        toast.error(t('community.messages.error_load'))
        panel.close()
        router.replace({ name: 'Browse' })
      }
    }
  },
  { immediate: true }
)

watch(
  () => panel.isOpen.value,
  (open) => {
    if (!open && detail.value) {
      router.replace({ name: 'Browse' })
    }
  }
)

// ── Navigation helpers ─────────────────────────────────────────────
function openProfileDrawer() {
  router.push({ name: 'Me' })
}

function openInboxDrawer() {
  router.push({ name: 'Inbox' })
}

function handlePostSelect(post: { id: string }) {
  router.push({ name: 'PublicPost', params: { postId: post.id } })
}
function handleEventSelect(event: { id: string }) {
  router.push({ name: 'PublicEvent', params: { eventId: event.id } })
}
function handleCommunitySelect(community: { id: string }) {
  router.push({ name: 'PublicCommunity', params: { communityId: community.id } })
}
function handleProfileSelect(profile: { id: string }) {
  router.push({ name: 'PublicProfile', params: { profileId: profile.id } })
}

// NearbyFeatures lives outside the map, so picking an item there must move the
// map for context. Map-marker clicks (handleMarkerSelect) and SearchBar's
// post:select don't need this — the marker click is already on-screen, and
// SearchBar emits its own location:set alongside post:select.
function onNearbyItemSelect(item: UserContentMetadata) {
  if (item.location) {
    const point = toGeoPoint(item.location)
    if (point) highlightedLocation.value = [point.lat, point.lon]
  }
  if (item.kind === 'post') handlePostSelect({ id: item.id })
  else if (item.kind === 'event') handleEventSelect({ id: item.id })
  else if (item.kind === 'community') handleCommunitySelect({ id: item.id })
}

function handleMarkerSelect(id: string) {
  const poi = allPois.value.find((p) => p.id === id)
  if (!poi) return
  if (poi.kind === 'post') handlePostSelect({ id })
  else if (poi.kind === 'event') handleEventSelect({ id })
  else if (poi.kind === 'community') handleCommunitySelect({ id })
  else handleProfileSelect({ id })
}

// ── Onboarding guard ───────────────────────────────────────────────
function checkOnboarding(): boolean {
  if (ownerProfileStore.profile && !ownerProfileStore.profile.isOnboarded) {
    router.push({ name: 'Onboarding' })
    return true
  }
  return false
}

// ── Lifecycle ──────────────────────────────────────────────────────
const isInitialized = ref(false)

async function initialize() {
  if (!ownerProfileStore.profile) return
  if (findProfileStore.lastMapBounds) {
    await findProfileStore.fetchBounds(findProfileStore.lastMapBounds, 7)
  }
  isInitialized.value = true
}

onActivated(async () => {
  if (checkOnboarding()) return
  if (!isInitialized.value) {
    await initialize()
  }
})

onMounted(async () => {
  await useBootstrap().bootstrap()
  if (checkOnboarding()) return
  await initialize()
})
</script>

<template>
  <div class="map-region h-100 position-relative overflow-hidden">
    <div
      class="search-bar-wrapper position-absolute w-100 top-0 end-0 d-flex align-items-start justify-content-end gap-2 p-2"
      style="z-index: 1010"
    >
      <div class="flex-grow-1 d-flex">
        <SearchBar
          :viewer-profile="viewerProfile"
          :available-tags="availableTags"
          @location:set="onLocationSet"
          @profile:select="handleProfileSelect"
          @post:select="handlePostSelect"
        />
        <MapLayerControl
          v-model="selectedLayers"
          class="ms-2"
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
        <InviteCtaShareDialog
          :trigger="isNoOneAround"
          :payload="shareInvitePayload"
        >
          {{ t('profiles.browse.no_results_cta_title') }}
        </InviteCtaShareDialog>

        <MapPlaceholder
          v-if="!isMapReady"
          class="position-absolute top-0 start-0 w-100 h-100 opacity-25"
        />

        <OsmPoiMap
          v-if="viewerProfile"
          :items="allPois"
          :clusters="clusters"
          :icon-resolver="iconResolver"
          :initial-center="initialMapCenter"
          :highlighted-location="highlightedLocation"
          :popup-resolver="popupResolver"
          :fetch-popup-data="fetchPopupData"
          class="h-100"
          @item:select="handleMarkerSelect"
          @bounds:changed="onBoundsChanged"
          @map:ready="onMapReady"
        />

        <NearbyFeatures
          :items="contentStore.feedItems"
          @item:select="onNearbyItemSelect"
        />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.list-view {
  height: 100vh;
}
.search-bar-wrapper {
  background: linear-gradient(to bottom, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
}
</style>
