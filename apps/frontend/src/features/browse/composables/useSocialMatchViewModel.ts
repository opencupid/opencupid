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
    isInitialized.value = true
  }

  const fetchResults = async () => {
    await Promise.all([
      findProfileStore.fetchDatingMatchIds(),
      findProfileStore.lastMapBounds
        ? findProfileStore.findProfilesForMapBounds(findProfileStore.lastMapBounds)
        : Promise.resolve(),
    ])
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
      const res = await findProfileStore.findProfilesForMapBounds(bounds)
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
      await fetchResults()
    } finally {
      isLoading.value = false
    }
  }

  return {
    viewerProfile,
    haveResults,
    isLoading: isLoading,
    storeError,
    initialize,
    hideProfile,
    matchFilter: toRef(ownerStore, 'matchFilter'),
    updatePrefs,
    onBoundsChanged,
    openProfile,
    profileList: computed(() => findProfileStore.profileList),
    matchedProfileIds: computed(() => findProfileStore.matchedProfileIds),
    isInitialized: isInitialized,
  }
}
