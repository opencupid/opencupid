import { computed, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'

import type { StoreError } from '@/store/helpers'
import type { OwnerProfile } from '@zod/profile/profile.dto'

import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

function socialFilterDefaults(ownerProfile: OwnerProfile) {
  return {
    location: ownerProfile.location,
    radius: 100,
    tags: ownerProfile.tags || [],
  }
}

export function useSocialMatchViewModel() {
  const router = useRouter()

  const ownerStore = useOwnerProfileStore()
  const findProfileStore = useFindProfileStore()

  const storeError = ref<StoreError | null>(null)
  const isInitialized = ref(false)

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
    await Promise.all([fetchResults(), findProfileStore.fetchDatingMatchIds()])
    isInitialized.value = true
  }

  const fetchResults = async () => {
    await findProfileStore.findSocialForMap()
  }

  function openProfile(profileId: string): void {
    router.push({ name: 'PublicProfile', params: { profileId } })
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

  const updatePrefs = async () => {
    const res = await findProfileStore.persistSocialFilter()
    if (!res.success) {
      storeError.value = res
      return
    }
    storeError.value = null
    fetchResults()
  }

  return {
    viewerProfile,
    haveResults,
    haveAccess,
    isLoading: computed(
      () => findProfileStore.isLoading || ownerStore.isLoading || !isInitialized.value
    ),
    storeError,
    initialize,
    hideProfile,
    socialFilter: toRef(findProfileStore, 'socialFilter'),
    updatePrefs,
    openProfile,
    profileList: computed(() => findProfileStore.profileList),
    matchedProfileIds: computed(() => findProfileStore.matchedProfileIds),
    isInitialized: computed(() => isInitialized.value),
  }
}
