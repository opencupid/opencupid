import { computed, ref, toRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { StoreError } from '@/store/helpers';
import type { ProfileScope } from '@zod/profile/profile.dto';

import { useFindProfileStore } from '@/features/browse/stores/findProfileStore';
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore';


export function useFindMatchViewModel() {
  const router = useRouter()

  const ownerStore = useOwnerProfileStore()
  const findProfileStore = useFindProfileStore()

  const storeError = ref<StoreError | null>(null)
  const currentScope = ref(null as ProfileScope | null)
  const selectedProfileId = ref<string | null>(null)
  const isInitialized = ref(false)

  const initialize = async (defaultScope?: ProfileScope) => {

    const meRes = await ownerStore.fetchOwnerProfile()
    if (!meRes.success) {
      storeError.value = meRes
      isInitialized.value = true
      return
    }
    if (!ownerStore.profile)
      throw new Error('Owner profile is not loaded')

    await ownerStore.fetchDatingPrefs()

    currentScope.value = defaultScope ? defaultScope :
      ownerStore.scopes.length > 0 ? ownerStore.scopes[0] : null
    
    isInitialized.value = true
  }

  const fetchResults = async () => {
    switch (currentScope.value) {
      case 'social': {
        const res = await findProfileStore.findSocial()
        if (!res.success) {
          storeError.value = res
          return
        }
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

  watch(() => currentScope.value, (newScope) => {
    if (!newScope) return // No scope selected
    fetchResults()
    router.replace({
      name: 'BrowseProfilesScope',
      params: {
        scope: newScope,
      },
    })
  })

  watch(() => selectedProfileId.value, (profileId) => {
    if (!profileId) return
    router.push({
      name: 'PublicProfile',
      params: {
        profileId: profileId,
      },
    })
  })

  const viewerProfile = computed(() => ownerStore.profile)

  const haveAccess = computed(() => {
    if (!viewerProfile.value) return false // Ensure viewerProfile is loaded
    switch(currentScope.value) {
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
    findProfileStore.reset()
    storeError.value = null
    selectedProfileId.value = null
    isInitialized.value = false
  }

  const updateDatingPrefs = async () => {
    const res = await ownerStore.persistDatingPrefs()
    if (!res.success) {
      storeError.value = res
      return
    }
    // Reset the error if successful
    storeError.value = null
    fetchResults() // Refresh results after updating prefs
  }

  return {
    viewerProfile,
    haveResults,
    haveAccess,
    isLoading: computed(() => findProfileStore.isLoading || ownerStore.isLoading || !isInitialized.value),
    storeError,
    initialize,
    hideProfile,
    reset,
    availableScopes: computed(() => ownerStore.scopes),
    currentScope,
    selectedProfileId,
    datingPrefs: toRef(ownerStore, 'datingPrefs'),
    updateDatingPrefs,
    profileList: computed(() => findProfileStore.profileList),
    isInitialized: computed(() => isInitialized.value),
  }


}