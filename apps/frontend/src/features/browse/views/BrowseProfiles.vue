<script setup lang="ts">
import { computed, onActivated, onMounted, provide, ref, toRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useBrowseViewModel } from '../composables/useBrowseViewModel'
import { useBrowseFiltersStore } from '@/features/browse/stores/browseFiltersStore'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
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
const filtersStore = useBrowseFiltersStore()
const { selectedTagIds } = storeToRefs(filtersStore)
watch(selectedTagIds, () => {
  findProfileStore.refetchBounds()
})

// Map center: starts at the viewer's own location, then moves when the
// user picks a fly-to target from the location filter.
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

// Drive the global detail panel from the route.
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
  await useBootstrap().bootstrap()
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
