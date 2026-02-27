import { computed, ref, toRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'
import { getPreviousUrl } from '@/router/history'

import type { StoreError } from '@/store/helpers'
import type { OwnerProfile } from '@zod/profile/profile.dto'

import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
enum ViewMode {
  map = 'map',
  grid = 'grid',
}

function socialFilterDefaults(ownerProfile: OwnerProfile) {
  return {
    location: ownerProfile.location,
    radius: 100,
    tags: ownerProfile.tags || [],
  }
}

export function useSocialMatchViewModel() {
  const router = useRouter()
  const route = useRoute()

  const ownerStore = useOwnerProfileStore()
  const findProfileStore = useFindProfileStore()

  const storeError = ref<StoreError | null>(null)
  const selectedProfileId = ref<string | null>(
    typeof route.params.profileId === 'string' ? route.params.profileId : null
  )
  const isInitialized = ref(false)

  const currentViewMode = computed(() =>
    typeof route.query.viewMode === 'string' &&
    Object.values(ViewMode).includes(route.query.viewMode as ViewMode)
      ? route.query.viewMode
      : 'map'
  )

  function isValidViewMode(mode: string): mode is ViewMode {
    return Object.values(ViewMode).includes(mode as ViewMode)
  }

  function navigateToViewMode(viewMode: string): void {
    if (isValidViewMode(viewMode)) {
      router.replace({ query: { ...route.query, viewMode } })
    }
  }

  const viewModeModel = computed({
    get: () => currentViewMode.value,
    set: (mode: string) => {
      navigateToViewMode(mode)
    },
  })

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

    await findProfileStore.fetchSocialFilter(socialFilterDefaults(ownerProfile))
    await fetchResults()
    isInitialized.value = true
  }

  const fetchResults = async () => {
    if (currentViewMode.value === 'map') {
      await findProfileStore.findSocialForMap()
    } else {
      await findProfileStore.findSocial()
    }
    lastFetchedViewMode = currentViewMode.value
  }

  let lastFetchedViewMode: string | null = null

  watch(currentViewMode, (newMode) => {
    if (!isInitialized.value) return
    if (newMode === lastFetchedViewMode) return
    fetchResults()
  })

  function openProfile(profileId: string): void {
    selectedProfileId.value = profileId
    router.replace({ name: 'PublicProfile', params: { profileId } })
  }

  function closeProfile(): void {
    selectedProfileId.value = null
    const returnUrl = getPreviousUrl()
    if (returnUrl.startsWith('/profile/')) {
      router.replace({ name: 'SocialMatch' })
    } else {
      router.replace(returnUrl)
    }
  }

  const viewerProfile = computed(() => ownerStore.profile)

  const haveAccess = computed(() => {
    if (!viewerProfile.value) return false
    return viewerProfile.value.isSocialActive
  })

  const haveResults = computed(() => {
    return findProfileStore.profileList.length > 0 && haveAccess.value
  })

  const hideProfile = (profileId: string) => {
    findProfileStore.hide(profileId)
  }

  const reset = () => {
    findProfileStore.teardown()
    storeError.value = null
    isInitialized.value = false
    lastFetchedViewMode = null
  }

  const updatePrefs = async () => {
    const res = await findProfileStore.persistSocialFilter()
    if (!res.success) {
      storeError.value = res
      return
    }
    storeError.value = null
    fetchResults()
  }

  const loadMoreProfiles = async () => {
    return await findProfileStore.loadMoreSocial()
  }

  return {
    viewerProfile,
    haveResults,
    haveAccess,
    isLoading: computed(
      () => findProfileStore.isLoading || ownerStore.isLoading || !isInitialized.value
    ),
    isLoadingMore: computed(() => findProfileStore.isLoadingMore),
    hasMoreProfiles: computed(() => findProfileStore.hasMoreProfiles),
    storeError,
    initialize,
    hideProfile,
    reset,
    selectedProfileId,
    socialFilter: toRef(findProfileStore, 'socialFilter'),
    updatePrefs,
    openProfile,
    closeProfile,
    profileList: computed(() => findProfileStore.profileList),
    isInitialized: computed(() => isInitialized.value),
    loadMoreProfiles,
    viewModeModel,
  }
}
