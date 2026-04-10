import { computed, ref } from 'vue'
import { useBootstrap } from '@/lib/bootstrap'

import type { StoreError } from '@/store/helpers'

import type { BoundsWithZoom } from '@/features/map/types/map.types'
import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

export function useProfilesViewModel() {
  const ownerStore = useOwnerProfileStore()
  const findProfileStore = useFindProfileStore()

  const storeError = ref<StoreError | null>(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
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

    await fetchResults()
    isInitialized.value = true
  }

  const fetchResults = async () => {
    if (findProfileStore.lastMapBounds) {
      await findProfileStore.findClustersForMapBounds(findProfileStore.lastMapBounds, lastZoom)
    }
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

  /**
   * Forces a refetch of clusters + bounds for the last known viewport.
   * Invoked when the ephemeral tag selection changes so the map reflects
   * the new filter immediately. Cheaper than a full re-initialize.
   */
  const refetchForCurrentBounds = async () => {
    findProfileStore.invalidateMapCache()
    await fetchResults()
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

  const fetchPopupData = (id: string | number) => findProfileStore.fetchProfileForPopup(String(id))

  return {
    viewerProfile,
    haveResults,
    isNoOneAround,
    isLoading,
    storeError,
    initialize,
    hideProfile,
    onBoundsChanged,
    refetchForCurrentBounds,
    clusterFeatures: computed(() => findProfileStore.clusterFeatures),
    isInitialized,
    fetchPopupData,
  }
}
