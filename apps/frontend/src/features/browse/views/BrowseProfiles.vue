<script setup lang="ts">
import { computed, onActivated, onMounted, provide, ref, toRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useProfilesViewModel } from '../composables/useProfilesViewModel'
import { useBrowseViewModel } from '../composables/useBrowseViewModel'
import { useBrowseFiltersStore } from '@/features/browse/stores/browseFiltersStore'
import { isValidLatLng, toLatLng } from '@/features/map/utils/mapUtils'
import { useDetailRouteState } from '@/features/shared/composables/useDetailRouteState'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'

import BrowseFilterBar from '../components/BrowseFilterBar.vue'
import OsmPoiMap from '@/features/map/components/OsmPoiMap.vue'
import NoResultsCTA from '../components/NoResultsCTA.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import PublicProfileView from '@/features/publicprofile/components/PublicProfileView.vue'

import ProfileMarker from '@/features/publicprofile/components/ProfileMarker.vue'
import MapIcon from '@/features/posts/components/MapIcon.vue'

import PostMapPopup from '@/features/posts/components/PostMapPopup.vue'
import PostFullView from '@/features/posts/components/PostFullView.vue'
import OwnerDrawerControls from '../components/OwnerDrawerControls.vue'
import type { PublicPostWithProfile } from '@zod/post/post.dto'

// Component name must be 'AppShell' for KeepAlive to identify it correctly
defineOptions({ name: 'AppShell' })

// ── Profile layer (existing cluster pipeline) ──────────────────────
const {
  viewerProfile,
  isNoOneAround,
  clusterFeatures,
  isInitialized,
  onBoundsChanged: onProfileBoundsChanged,
  initialize,
  refetchForCurrentBounds,
  fetchPopupData,
} = useProfilesViewModel()

// Ephemeral tag filter state (client-only). Changing it triggers a refetch
// of the current viewport so the map reflects the new filter immediately.
const filtersStore = useBrowseFiltersStore()
const { selectedTagIds } = storeToRefs(filtersStore)
watch(selectedTagIds, () => {
  refetchForCurrentBounds()
})

// Map center: starts at the viewer's own location, then moves when the
// user picks a fly-to target from the location filter. OsmPoiMap watches
// its `center` prop and pans imperatively when it changes (see
// MapController.flyToCenter).
const mapCenterOverride = ref<[number, number] | null>(null)
const mapCenter = computed<[number, number] | undefined>(() => {
  if (mapCenterOverride.value) return mapCenterOverride.value
  const fromProfile = toLatLng(viewerProfile.value?.location)
  return isValidLatLng(fromProfile) ? fromProfile : undefined
})
function onLocationFlyTo(coords: { lat: number; lon: number }) {
  mapCenterOverride.value = [coords.lat, coords.lon]
}

provide('viewerProfile', toRef(viewerProfile))

// ── Post layer + tags + merged map data + selection state ──────────
const { clusters, allPois, availableTags, activePoi, onSelectionClear, onBoundsChanged } =
  useBrowseViewModel(clusterFeatures, onProfileBoundsChanged)

// ── Route-driven detail panel ──────────────────────────────────────
const router = useRouter()
const ownerProfileStore = useOwnerProfileStore()

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
// DetailPanelOrchestrator in AppShellLayout — we just push content into it.
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

// ── Onboarding guard ───────────────────────────────────────────────
// Redirect non-onboarded users to the onboarding flow.
// Returns true if a redirect was triggered (caller should bail out early).
function checkOnboarding(): boolean {
  if (ownerProfileStore.profile && !ownerProfileStore.profile.isOnboarded) {
    router.push({ name: 'Onboarding' })
    return true
  }
  return false
}

// ── Lifecycle ──────────────────────────────────────────────────────
// onActivated fires on every <KeepAlive> re-entry — including when a freshly
// registered user lands on /browse after magic-link login while a previous
// (onboarded) component instance is still cached. Without this hook, onMounted
// would NOT re-run and the redirect check would be silently skipped.
//
// On initial mount, onActivated fires before onMounted's await bootstrap()
// resolves, so ownerProfileStore.profile is still null — checkOnboarding()
// returns early safely. The real redirect on cold-start is handled by
// onMounted below.
onActivated(async () => {
  if (checkOnboarding()) return
  if (!isInitialized.value) {
    await initialize()
  }
})

onMounted(async () => {
  // bootstrap() is idempotent — if already resolved (cold-start) it returns
  // instantly; if still in-flight (hot-start via verifyToken) it joins the
  // existing promise. Either way, ownerProfileStore.profile is populated by
  // the time we reach checkOnboarding() below.
  await useBootstrap().bootstrap()
  if (checkOnboarding()) return
  await initialize()
})
</script>

<template>
  <!-- Detail panel content is pushed into DetailPanelOrchestrator (AppShellLayout)
       imperatively via useDetailPanel() — see watcher above. -->

  <!-- Map region (only content that stays in-place) -->
  <div class="map-region h-100 position-relative overflow-hidden">
    <div
      class="position-absolute w-100 top-0 end-0 d-flex align-items-center justify-content-end gap-2 p-2"
      style="z-index: 1010"
    >
      <div class="flex-grow-1">
        <BrowseFilterBar
          :viewer-profile="viewerProfile"
          :available-tags="availableTags"
          @location:fly-to="onLocationFlyTo"
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
