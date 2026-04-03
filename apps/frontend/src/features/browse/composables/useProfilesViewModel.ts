import { computed, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'

import type { StoreError } from '@/store/helpers'

import type { BoundsWithZoom } from '@/features/shared/components/osmPoiMap/OsmPoiMap.types'
import { isValidLatLng, toLatLng } from '@/features/shared/components/osmPoiMap/mapUtils'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

export function useProfilesViewModel() {
  const router = useRouter()

  const ownerStore = useOwnerProfileStore()
  const findProfileStore = useFindProfileStore()

  const storeError = ref<StoreError | null>(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
  // Tracks the filter snapshot that was used for the last map fetch.
  // Plain variable — not reactive — it's internal bookkeeping, not UI state.
  let renderedFilterSnapshot = ''
  let lastZoom = 7

  const initialize = async () => {
    await useBootstrap().bootstrap()

    const ownerProfile = ownerStore.profile
    if (!ownerProfile) {
      storeError.value = {
        success: false,
        status: 404,
        message: 'Owner profile not found',
      }
      return
    }

    await ownerStore.fetchMatchFilter()
    await fetchResults()
    renderedFilterSnapshot = JSON.stringify(ownerStore.matchFilter)
    isInitialized.value = true
  }

  const fetchResults = async () => {
    if (findProfileStore.lastMapBounds) {
      await findProfileStore.findClustersForMapBounds(findProfileStore.lastMapBounds, lastZoom)
    }
  }

  // Called on onActivated to handle the case where the filter was mutated
  // externally (e.g. UserHome tag-cloud selection) before navigating here.
  const refreshIfFilterChanged = async () => {
    const currentSnapshot = JSON.stringify(ownerStore.matchFilter)
    if (currentSnapshot === renderedFilterSnapshot) return
    findProfileStore.invalidateMapCache()
    await fetchResults()
    renderedFilterSnapshot = currentSnapshot
  }

  // moveend fires after updateMarkers() rebuilds the cluster
  // layer, which triggers emitBounds → debounced bounds-changed
  // → onBoundsChanged → redundant identical fetch
  function sameViewport(
    a: { south: number; north: number; west: number; east: number } | null,
    aZoom: number,
    b: { south: number; north: number; west: number; east: number },
    bZoom: number
  ): boolean {
    return (
      aZoom === bZoom &&
      a !== null &&
      a.south === b.south &&
      a.north === b.north &&
      a.west === b.west &&
      a.east === b.east
    )
  }

  const onBoundsChanged = async ({ bounds, zoom }: BoundsWithZoom) => {
    if (sameViewport(findProfileStore.lastMapBounds, lastZoom, bounds, zoom)) return
    lastZoom = zoom
    isLoading.value = true
    try {
      const res = await findProfileStore.findClustersForMapBounds(bounds, zoom)
      if (!res.success) {
        storeError.value = res
      }
    } finally {
      isLoading.value = false
    }
  }

  function openProfile(profileId: string): void {
    router.push({ name: 'PublicProfile', params: { profileId } })
  }

  const viewerProfile = computed(() => ownerStore.profile)

  const haveResults = computed(() => {
    return findProfileStore.clusterFeatures.length > 0
  })

  // isNoOneAround is true if the only profile is the
  // viewer themselves
  const isNoOneAround = computed(() => {
    const features = findProfileStore.clusterFeatures
    if (features.length === 0) return false
    const first = features[0]
    if (
      features.length === 1 &&
      first &&
      first.type === 'point' &&
      first.id === viewerProfile.value?.id
    ) {
      return true
    }
    return false
  })

  const hideProfile = (profileId: string) => {
    findProfileStore.hide(profileId)
  }

  const updatePrefs = async () => {
    isLoading.value = true
    try {
      const res = await ownerStore.persistMatchFilter()
      if (!res.success) {
        storeError.value = res
        return
      }
      storeError.value = null
      findProfileStore.invalidateMapCache()
      await fetchResults()
      renderedFilterSnapshot = JSON.stringify(ownerStore.matchFilter)
    } finally {
      isLoading.value = false
    }
  }

  const mapCenter = computed<[number, number] | undefined>(() => {
    const fromFilter = toLatLng(ownerStore.matchFilter?.location)
    if (isValidLatLng(fromFilter)) return fromFilter

    const fromProfile = toLatLng(viewerProfile.value?.location)
    if (isValidLatLng(fromProfile)) return fromProfile

    return undefined
  })

  const fetchPopupData = (id: string | number) =>
    findProfileStore.fetchProfileForPopup(String(id))

  return {
    viewerProfile,
    haveResults,
    isNoOneAround,
    isLoading,
    storeError,
    initialize,
    hideProfile,
    matchFilter: toRef(ownerStore, 'matchFilter'),
    updatePrefs,
    onBoundsChanged,
    refreshIfFilterChanged,
    openProfile,
    clusterFeatures: computed(() => findProfileStore.clusterFeatures),
    isInitialized,
    mapCenter,
    fetchPopupData,
  }
}
