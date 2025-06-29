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

  const me = computed(() => ownerStore.profile)

  const storeError = ref<StoreError | null>(null)
  const currentScope = ref(null as ProfileScope | null)
  const selectedProfileId = ref<string | null>(null)

  const initialize = async (defaultScope?: ProfileScope) => {

    console.log('Initializing FindMatchViewModel with defaultScope:', defaultScope)
    const meRes = await ownerStore.fetchOwnerProfile()
    if (!meRes.success) {
      storeError.value = meRes
      return
    }
    if (!me.value)
      throw new Error('Owner profile is not loaded')

    await ownerStore.fetchDatingPrefs()

    currentScope.value = defaultScope ? defaultScope :
      ownerStore.scopes.length > 0 ? ownerStore.scopes[0] : null
  }

  watch(() => currentScope.value, (newScope) => {
    if (!newScope) return // No scope selected
    if (newScope === 'social') {
      findProfileStore.findSocial()
    } else if (newScope === 'dating') {
      findProfileStore.findDating()
    }
    router.replace({
      name: 'BrowseProfilesScope',
      params: {
        scope: newScope,
      },
    })
  })

  watch(() => selectedProfileId.value, (profileId) => {
    if (!profileId) return // No scope selected
    router.push({
      name: 'PublicProfile',
      params: {
        profileId: profileId,
      },
    })
  })

  const haveAccess = computed(() => {
    if (!me.value) return false // Ensure me is loaded
    if (currentScope.value === 'social') {
      return me.value.isSocialActive
    } else if (currentScope.value === 'dating') {
      return me.value.isDatingActive
    }
    return false
  })

  const haveResults = computed(() => {
    return findProfileStore.profileList.length > 0 && haveAccess.value
  })

  const isLoading = computed(() => {
    return findProfileStore.isLoading
  })

  const hideProfile = (profileId: string) => {
    findProfileStore.hide(profileId)
  }

  const reset = () => {
    findProfileStore.reset()
    storeError.value = null
    selectedProfileId.value = null
  }

  return {
    haveResults,
    haveAccess,
    isLoading,
    storeError,
    initialize,
    hideProfile,
    reset,
    availableScopes: computed(() => ownerStore.scopes),
    currentScope,
    selectedProfileId,
    datingPrefs: toRef(ownerStore, 'datingPrefs'),
    profileList: computed(() => findProfileStore.profileList),
  }


}