import { computed, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'

import type { StoreError } from '@/store/helpers'

import { useFindProfileStore, type MapBounds } from '@/features/browse/stores/findProfileStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

export function useSocialMatchViewModel() {
  const router = useRouter()

  const ownerStore = useOwnerProfileStore()
  const findProfileStore = useFindProfileStore()

  const storeError = ref<StoreError | null>(null)
  const isInitialized = ref(false)
  const isLoading = ref(false)
  // Tracks the filter snapshot that was used for the last map fetch.
  // Plain variable — not reactive — it's internal bookkeeping, not UI state.
  let renderedFilterSnapshot = ''

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
    await Promise.all([
      findProfileStore.fetchDatingMatchIds(),
      findProfileStore.lastMapBounds
        ? findProfileStore.findClustersForMapBounds(findProfileStore.lastMapBounds)
        : Promise.resolve(),
    ])
  }

  // Called on onActivated to handle the case where the filter was mutated
  // externally (e.g. UserHome tag-cloud selection) before navigating here.
  const refreshIfFilterChanged = async () => {
    const currentSnapshot = JSON.stringify(ownerStore.matchFilter)
    if (currentSnapshot === renderedFilterSnapshot) return
    findProfileStore.invalidateMapCache()
    await Promise.all([
      findProfileStore.fetchDatingMatchIds(),
      findProfileStore.lastMapBounds
        ? findProfileStore.findClustersForMapBounds(findProfileStore.lastMapBounds)
        : Promise.resolve(),
    ])
    renderedFilterSnapshot = currentSnapshot
  }

  // moveend fires after updateMarkers() rebuilds the cluster
  // layer, which triggers emitBounds → debounced bounds-changed
  // → onBoundsChanged → redundant identical fetch
  function sameBounds(a: MapBounds | null, b: MapBounds): boolean {
    return (
      a !== null &&
      a.south === b.south &&
      a.north === b.north &&
      a.west === b.west &&
      a.east === b.east
    )
  }

  const onBoundsChanged = async (bounds: MapBounds) => {
    if (sameBounds(findProfileStore.lastMapBounds, bounds)) return
    isLoading.value = true
    try {
      const res = await findProfileStore.findClustersForMapBounds(bounds)
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
    return findProfileStore.profileList.length > 0
  })

  // isNoOneAround is true if the only profile is the
  // viewer themselves
  const isNoOneAround = computed(() => {
    const list = findProfileStore.profileList
    if (list.length === 0) return false
    if (list.length === 1 && list[0]?.id === viewerProfile.value?.id) return true
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

  return {
    viewerProfile,
    haveResults,
    isNoOneAround,
    isLoading: isLoading,
    storeError,
    initialize,
    hideProfile,
    matchFilter: toRef(ownerStore, 'matchFilter'),
    updatePrefs,
    onBoundsChanged,
    refreshIfFilterChanged,
    openProfile,
    profileList: computed(() => findProfileStore.profileList),
    mapClusters: computed(() => findProfileStore.mapClusters),
    mapProfiles: computed(() => findProfileStore.mapProfiles),
    matchedProfileIds: computed(() => findProfileStore.matchedProfileIds),
    isInitialized: isInitialized,
  }
}
