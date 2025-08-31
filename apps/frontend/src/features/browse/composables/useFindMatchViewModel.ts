import { computed, ref, toRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'
import { useLocalStore } from '@/store/localStore'

import type { StoreError } from '@/store/helpers';
import type { OwnerProfile, ProfileScope } from '@zod/profile/profile.dto';

import { useFindProfileStore } from '@/features/browse/stores/findProfileStore';
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore';
import { useAgeFields } from '@/features/shared/composables/useAgeFields';

enum ViewMode {
  'map',
  'grid',
}


function datingPrefsDefaults(ownerProfile: OwnerProfile) {
  const { age } = useAgeFields(ownerProfile.birthday)
  return {
    prefAgeMin: age.value ? age.value - 5 : 18,
    prefAgeMax: age.value ? age.value + 5 : 100,
    prefGender: [],
    prefKids: [],
  }
}

function socialFilterDefaults(ownerProfile: OwnerProfile) {
  return {
    location: ownerProfile.location,
    radius: 100,
    tags: ownerProfile.tags || [],
  }
}

export function useFindMatchViewModel() {

  const router = useRouter()
  const route = useRoute()

  const ownerStore = useOwnerProfileStore()
  const findProfileStore = useFindProfileStore()

  const storeError = ref<StoreError | null>(null)
  const currentScope = computed(() =>
    typeof route.params.scope === 'string'
      ? (route.params.scope as ProfileScope)
      : null
  )
  const selectedProfileId = computed(() =>
    typeof route.params.profileId === 'string' ? route.params.profileId : null
  )
  const isInitialized = ref(false)

  const localStore = useLocalStore()
  const savedScope = computed(() => localStore.getCurrentScope)

  const currentViewMode = computed(() =>
    typeof route.query.viewMode === 'string' && Object.values(ViewMode).includes(route.query.viewMode)
      ? (route.query.viewMode)
      : 'grid'
  )

  function navigateToViewMode(viewMode: ViewMode): void {
    router.replace({ query: { ...route.query, viewMode } })
  }

  const viewModeModel = computed({
    get: () => currentViewMode.value,
    set: (mode: ViewMode) => {
      navigateToViewMode(mode)
    },
  })

  const initialize = async (defaultScope?: ProfileScope) => {

    // ensure ownerProfile is initialized
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
    if (ownerProfile.isDatingActive) {
      await findProfileStore.fetchDatingPrefs(datingPrefsDefaults(ownerProfile))
    }

    resolveScope(defaultScope)
    if (currentScope.value) await fetchResults()

    isInitialized.value = true
  }

  function resolveScope(defaultScope?: ProfileScope) {
    if (!currentScope.value && !selectedProfileId.value) {
      const resolvedScope =
        defaultScope ??
        savedScope.value ??
        (ownerStore.scopes.length > 0 ? ownerStore.scopes[0] : null)
      if (resolvedScope) navigateToScope(resolvedScope)
    }
  }

  const fetchResults = async () => {
    switch (currentScope.value) {
      case 'social': {
        await findProfileStore.findSocial()
        break
      }
      case 'dating': {
        await findProfileStore.findDating()
        break
      }
      default: {
        console.warn('No valid scope selected, cannot fetch results')
        return
      }
    }
  }

  watch(currentScope, (newScope) => {
    if (!newScope) return // No scope selected
    fetchResults()
  })

  // this forces re-rendering the view when the route changes
  // e.g. details view -> /browse
  watch(() => route.fullPath, () => {
    resolveScope()
  })

  watch(
    () => route.params.scope,
    (scope) => {
      if (typeof scope === 'string') localStore.setCurrentScope(scope as ProfileScope)
    }
  )

  function navigateToScope(scope: ProfileScope): void {
    router.replace({ name: 'BrowseProfilesScope', params: { scope } })
  }

  function openProfile(profileId: string): void {
    router.push({ name: 'PublicProfile', params: { profileId } })
  }

  const scopeModel = computed({
    get: () => currentScope.value,
    set: (scope: ProfileScope | null) => {
      if (scope) navigateToScope(scope)
    },
  })

  const viewerProfile = computed(() => ownerStore.profile)

  const haveAccess = computed(() => {
    if (!viewerProfile.value) return false // Ensure viewerProfile is loaded
    switch (currentScope.value) {
      case 'social':
        return viewerProfile.value.isSocialActive
      case 'dating':
        return viewerProfile.value.isDatingActive
      default:
        return false
    }
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
  }

  const updatePrefs = async () => {
    let res
    switch (currentScope.value) {
      case 'social':
        res = await findProfileStore.persistSocialFilter()
        break
      case 'dating':
        res = await findProfileStore.persistDatingPrefs()
        break
      default:
        return false
    }
    if (!res.success) {
      storeError.value = res
      return
    }
    storeError.value = null
    fetchResults() // Refresh results after updating prefs
  }

  const loadMoreProfiles = async () => {
    console.log('🔍 useFindMatchViewModel.loadMoreProfiles - scope:', currentScope.value)
    switch (currentScope.value) {
      case 'social': {
        return await findProfileStore.loadMoreSocial()
      }
      case 'dating': {
        return await findProfileStore.loadMoreDating()
      }
      default: {
        console.warn('No valid scope selected, cannot load more profiles')
        return
      }
    }
  }

  return {
    viewerProfile,
    haveResults,
    haveAccess,
    isLoading: computed(() => findProfileStore.isLoading || ownerStore.isLoading || !isInitialized.value),
    isLoadingMore: computed(() => findProfileStore.isLoadingMore),
    hasMoreProfiles: computed(() => findProfileStore.hasMoreProfiles),
    storeError,
    initialize,
    hideProfile,
    reset,
    availableScopes: computed(() => ownerStore.scopes),
    currentScope,
    selectedProfileId,
    datingPrefs: toRef(findProfileStore, 'datingPrefs'),
    socialFilter: toRef(findProfileStore, 'socialFilter'),
    updatePrefs,
    scopeModel,
    openProfile,
    profileList: computed(() => findProfileStore.profileList),
    isInitialized: computed(() => isInitialized.value),
    loadMoreProfiles,
    viewModeModel,
  }


}