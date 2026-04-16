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
import { useDetailRouteState } from '@/features/shared/composables/useDetailRouteState'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'

import OsmPoiMap from '@/features/map/components/OsmPoiMap.vue'
import MapPlaceholder from '@/features/shared/components/MapPlaceholder.vue'
import SearchBar from '../components/SearchBar.vue'
import ProfileMapCard from '../components/ProfileMapCard.vue'
import PublicProfileView from '@/features/publicprofile/components/PublicProfileView.vue'

import ProfileMarker from '@/features/publicprofile/components/ProfileMarker.vue'
import MapIcon from '@/features/posts/components/MapIcon.vue'

import PostMapPopup from '@/features/posts/components/PostMapPopup.vue'
import PostFullView from '@/features/posts/components/PostFullView.vue'
import OwnerDrawerControls from '../components/OwnerDrawerControls.vue'
import { usePostStore } from '@/features/posts/stores/postStore'
import type { GeoPoint, LocationDTO } from '@zod/dto/location.dto'
import ShareDialog from '@/features/app/components/ShareDialog.vue'
import type { PostSummary } from '@zod/post/post.dto'
import type { ProfileSummary } from '@zod/profile/profile.dto'

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

// Map center: starts at the viewer's own location, then moves when the
// user picks a fly-to target from the location filter.
const mapCenterOverride = ref<[number, number] | null>(null)

// Placeholder visibility. Flipped by @map:ready from OsmPoiMap once the
// first tile load completes. Hoisted out of OsmPoiMap so it paints from
// first render — i.e. before mapCenter resolves and the map mounts.
const isMapReady = ref(false)
function onMapReady() {
  isMapReady.value = true
}
const mapCenter = computed<[number, number] | undefined>(() => {
  if (mapCenterOverride.value) return mapCenterOverride.value
  const fromProfile = toLatLng(viewerProfile.value?.location)
  return isValidLatLng(fromProfile) ? fromProfile : undefined
})
function onLocationSet(point: GeoPoint) {
  mapCenterOverride.value = [point.lat, point.lon]
}

provide('viewerProfile', toRef(viewerProfile))

// ── Route-driven detail panel ──────────────────────────────────────
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const ownerProfileStore = useOwnerProfileStore()
const postStore = usePostStore()

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
  detail,
  async (d) => {
    if (!d) {
      panel.close()
      return
    }
    if (d.type === 'profile') {
      panel.show(PublicProfileView, { profileId: d.id })
    } else if (d.type === 'post') {
      const result = await postStore.fetchPublicPost(d.id)
      if (result.success && result.data) {
        panel.show(PostFullView, { post: result.data.post })
      } else {
        toast.error(t('posts.messages.error_load'))
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

function handlePostSelect(post: PostSummary) {
  router.push({ name: 'PublicPost', params: { postId: String(post.id) } })
}
function handleProfileSelect(profile: ProfileSummary) {
  router.push({ name: 'PublicProfile', params: { profileId: String(profile.id) } })
}

function handleMarkerSelect(id: string | number) {
  const poi = allPois.value.find((p) => p.id === id)
  if (!poi) return
  if (poi.type === 'post') {
    handlePostSelect(poi.source as PostSummary)
  } else {
    handleProfileSelect(poi.source as ProfileSummary)
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
      class="position-absolute w-100 top-0 end-0 d-flex align-items-start justify-content-end gap-2 p-2"
      style="z-index: 1010"
    >
      <div class="flex-grow-1">
        <SearchBar
          :viewer-profile="viewerProfile"
          :available-tags="availableTags"
          @location:set="onLocationSet"
          @profile:select="handleProfileSelect"
          @post:select="handlePostSelect"
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
        <ShareDialog :trigger="isNoOneAround">
          {{ t('profiles.browse.no_results_cta_title') }}
        </ShareDialog>

        <MapPlaceholder
          v-if="!isMapReady"
          class="position-absolute top-0 start-0 w-100 h-100 opacity-25"
        />

        <OsmPoiMap
          v-if="mapCenter"
          :items="allPois"
          :clusters="clusters"
          :icon-resolver="(poi) => (poi.type === 'post' ? MapIcon : ProfileMarker)"
          :center="mapCenter"
          :popup-resolver="(poi) => (poi.type === 'post' ? PostMapPopup : ProfileMapCard)"
          :fetch-popup-data="fetchPopupData"
          class="h-100"
          @item:select="handleMarkerSelect"
          @bounds:changed="onBoundsChanged"
          @map:ready="onMapReady"
        />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.list-view {
  height: 100vh;
}
</style>
