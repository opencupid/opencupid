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
import {
  useDetailRouteState,
  detailRoute,
  GRID_ROUTE,
} from '@/features/shared/composables/useDetailRouteState'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'
import { useBrowseGridStore } from '@/features/browse/stores/browseGridStore'
import { countFeaturesInBounds } from '@/features/browse/utils/boundsUtils'
import { browseItemTarget } from '@/features/browse/utils/browseListItem'
import { isMdUp } from '@/lib/responsive'
import { useAreaName } from '@/features/geocoding/composables/useAreaName'
import { useGridUrlSync } from '../composables/useGridUrlSync'
import type { GeocodingResult } from '@/features/geocoding/composables/useGeocoder'
import type { MapBounds } from '@/features/map/types/map.types'

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
import BrowseGridChip from '../components/BrowseGridChip.vue'
import BrowseGridPanel from '../components/BrowseGridPanel.vue'
import type { BrowseListItem } from '@zod/browse/browseList.dto'
import type { PublicTag } from '@zod/tag/tag.dto'
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
const { selectedTags, selectedTagIds } = storeToRefs(searchStore)
watch(selectedTagIds, () => {
  findProfileStore.refetchBounds()
})

const { selectedLayers, lastMapBounds, clusterFeatures } = storeToRefs(findProfileStore)

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

const { detail, isGridOpen } = useDetailRouteState()
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
        router.replace(closeDetailRoute())
      }
    } else if (d.type === 'event') {
      const result = await contentStore.fetchPublicEvent(d.id)
      if (result.success && result.data) {
        panel.show(EventFullView, { event: result.data.event })
      } else {
        toast.error(t('events.messages.error_load'))
        panel.close()
        router.replace(closeDetailRoute())
      }
    } else if (d.type === 'community') {
      const result = await contentStore.fetchPublicCommunity(d.id)
      if (result.success && result.data) {
        panel.show(CommunityFullView, { community: result.data.community })
      } else {
        toast.error(t('community.messages.error_load'))
        panel.close()
        router.replace(closeDetailRoute())
      }
    }
  },
  { immediate: true }
)

watch(
  () => panel.isOpen.value,
  (open) => {
    if (!open && detail.value) {
      router.replace(closeDetailRoute())
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

// Details open over whatever the user is looking at: the map, or the grid.
function handlePostSelect(post: { id: string }) {
  router.push(detailRoute('post', post.id, isGridOpen.value))
}
function handleEventSelect(event: { id: string }) {
  router.push(detailRoute('event', event.id, isGridOpen.value))
}
function handleCommunitySelect(community: { id: string }) {
  router.push(detailRoute('community', community.id, isGridOpen.value))
}
function handleProfileSelect(profile: { id: string }) {
  router.push(detailRoute('profile', profile.id, isGridOpen.value))
}

// ── Browse grid ────────────────────────────────────────────────────
// The grid mirrors the map: it lists what is inside the map's current
// bounds, with the same tag and layer filters.
const gridStore = useBrowseGridStore()

watch(
  [isGridOpen, lastMapBounds, selectedTagIds, selectedLayers],
  ([open, bounds, tagIds, kinds]) => {
    if (!open || !bounds) return
    gridStore.load({ bounds, tagIds, kinds })
  },
  { immediate: true }
)

const gridChipCount = computed(() =>
  lastMapBounds.value ? countFeaturesInBounds(clusterFeatures.value, lastMapBounds.value) : 0
)

function closeDetailRoute() {
  return { name: isGridOpen.value ? GRID_ROUTE : 'Browse' }
}

function openGrid() {
  router.push({ name: GRID_ROUTE })
}

function closeGrid() {
  // Step back when the grid was opened from the map, so the back button
  // doesn't reopen it; otherwise (deep link) replace it with the map.
  const back = window.history.state?.back
  if (back && back === router.resolve({ name: 'Browse' }).fullPath) router.back()
  else router.replace({ name: 'Browse' })
}

function onGridSelect(item: BrowseListItem) {
  const { type, id } = browseItemTarget(item)
  router.push(detailRoute(type, id, true))
}

// Hovering a grid card emphasises its pin; only where the map is visible
// next to the grid.
const hoveredGridItemId = ref<string | null>(null)
const emphasizedPoiId = computed(() => (isMdUp.value ? hoveredGridItemId.value : null))
function onGridHover(item: BrowseListItem | null) {
  hoveredGridItemId.value = item ? browseItemTarget(item).id : null
}
// The panel unmounts on close without a mouseleave.
watch(isGridOpen, (open) => {
  if (!open) hoveredGridItemId.value = null
})

const pulsePoi = ref<{ id: string } | null>(null)

function onGridLocate(item: BrowseListItem) {
  const { id, point } = browseItemTarget(item)
  if (point) highlightedLocation.value = [point.lat, point.lon]
  pulsePoi.value = { id }
  // On phones the grid covers the map: close it to show the item.
  if (!isMdUp.value) closeGrid()
}

function onGridTagToggle(tag: PublicTag) {
  searchStore.toggleTag(tag)
}

// Header name of the map area ("Szentendre & around"), looked up only while
// the grid is open.
const { name: gridAreaName } = useAreaName(lastMapBounds, isGridOpen)

// Picking a place fits the map to it. The map then reports its new bounds,
// which reloads the grid and renames the area through the watchers above.
const focusBounds = ref<MapBounds | null>(null)
function onGridPlaceSelect(place: GeocodingResult) {
  if (place.bounds) focusBounds.value = { ...place.bounds }
  else highlightedLocation.value = [place.lat, place.lon]
}

// Tags and map area live in the grid URL, so a grid link can be shared.
useGridUrlSync({
  bounds: lastMapBounds,
  selectedTags,
  setTags: (tags) => searchStore.setTags(tags),
  fitBounds: (bounds) => {
    focusBounds.value = { ...bounds }
  },
})

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
  <div
    class="map-region h-100 position-relative overflow-hidden"
    :class="{ 'grid-open': isGridOpen }"
  >
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
          @event:select="handleEventSelect"
          @community:select="handleCommunitySelect"
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
          :focus-bounds="focusBounds"
          :emphasized-poi-id="emphasizedPoiId"
          :pulse-poi="pulsePoi"
          :popup-resolver="popupResolver"
          :fetch-popup-data="fetchPopupData"
          class="h-100"
          @item:select="handleMarkerSelect"
          @bounds:changed="onBoundsChanged"
          @map:ready="onMapReady"
        />

        <NearbyFeatures
          v-if="!isGridOpen"
          :items="contentStore.feedItems"
          @item:select="onNearbyItemSelect"
        />

        <BrowseGridChip
          v-if="!isGridOpen"
          class="browse-grid-chip-position position-absolute start-50 translate-middle-x"
          :count="gridChipCount"
          :loading="findProfileStore.isLoading"
          @open="openGrid"
        />
      </div>
    </main>

    <BrowseGridPanel
      v-if="isGridOpen"
      v-model:kinds="selectedLayers"
      class="browse-grid-overlay"
      :area-name="gridAreaName"
      :items="gridStore.items"
      :total="gridStore.total"
      :has-more="gridStore.hasMore"
      :is-loading="gridStore.isLoading"
      :is-loading-more="gridStore.isLoadingMore"
      :selected-tags="selectedTags"
      :available-tags="availableTags"
      :share-payload="shareInvitePayload"
      @close="closeGrid"
      @place:select="onGridPlaceSelect"
      @select="onGridSelect"
      @locate="onGridLocate"
      @hover="onGridHover"
      @tag:add="onGridTagToggle"
      @tag:remove="onGridTagToggle"
      @load-more="gridStore.loadMore()"
    />
  </div>
</template>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';

.list-view {
  height: 100vh;
}
.search-bar-wrapper {
  background: linear-gradient(to bottom, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
}

// Below the search bar row; the bottom edge belongs to NearbyFeatures.
.browse-grid-chip-position {
  top: 4.5rem;
  z-index: 1006;
}

$grid-panel-width: 26rem;

// Full-screen overlay on phones; a right-hand panel over the live map from md.
.browse-grid-overlay {
  position: absolute;
  inset: 0;
  z-index: 1020;

  @include media-breakpoint-up(md) {
    left: auto;
    width: $grid-panel-width;
    border-left: 1px solid var(--bs-border-color);
    box-shadow: var(--bs-box-shadow);
  }
}

// Keep the search bar and owner controls clear of the grid panel.
@include media-breakpoint-up(md) {
  .grid-open .search-bar-wrapper {
    padding-right: calc(#{$grid-panel-width} + 0.5rem) !important;
  }
}
</style>
