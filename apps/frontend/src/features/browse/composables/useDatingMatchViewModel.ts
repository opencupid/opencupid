import { computed, ref, toRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBootstrap } from '@/lib/bootstrap'
import { getPreviousUrl } from '@/router'

import type { StoreError } from '@/store/helpers'
import type { OwnerProfile } from '@zod/profile/profile.dto'

import { useFindProfileStore } from '@/features/browse/stores/findProfileStore'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useAgeFields } from '@/features/shared/composables/useAgeFields'
import { useInteractionsViewModel } from '@/features/interaction/composables/useInteractionsViewModel'

function datingPrefsDefaults(ownerProfile: OwnerProfile) {
  const { age } = useAgeFields(ownerProfile.birthday)
  return {
    prefAgeMin: age.value ? age.value - 5 : 18,
    prefAgeMax: age.value ? age.value + 5 : 100,
    prefGender: [],
    prefKids: [],
  }
}

export function useDatingMatchViewModel() {
  const router = useRouter()
  const route = useRoute()

  const ownerStore = useOwnerProfileStore()
  const findProfileStore = useFindProfileStore()
  const interactions = useInteractionsViewModel()

  const storeError = ref<StoreError | null>(null)
  const selectedProfileId = ref<string | null>(
    typeof route.params.profileId === 'string' ? route.params.profileId : null
  )
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

    await findProfileStore.fetchDatingPrefs(datingPrefsDefaults(ownerProfile))
    await fetchResults()
    isInitialized.value = true
  }

  const fetchResults = async () => {
    await findProfileStore.findDating()
  }

  function openProfile(profileId: string): void {
    selectedProfileId.value = profileId
    router.replace({ name: 'DatingMatch', params: { profileId } })
  }

  function closeProfile(): void {
    selectedProfileId.value = null
    const returnUrl = getPreviousUrl()
    if (returnUrl.startsWith('/matches/')) {
      router.replace({ name: 'DatingMatch' })
    } else {
      router.replace(returnUrl)
    }
  }

  const viewerProfile = computed(() => ownerStore.profile)

  const haveAccess = computed(() => {
    if (!viewerProfile.value) return false
    return viewerProfile.value.isDatingActive
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
    const res = await findProfileStore.persistDatingPrefs()
    if (!res.success) {
      storeError.value = res
      return
    }
    storeError.value = null
    fetchResults()
  }

  const loadMoreProfiles = async () => {
    return await findProfileStore.loadMoreDating()
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
    datingPrefs: toRef(findProfileStore, 'datingPrefs'),
    updatePrefs,
    openProfile,
    closeProfile,
    profileList: computed(() => findProfileStore.profileList),
    isInitialized: computed(() => isInitialized.value),
    loadMoreProfiles,
    // Interaction data for matches/likes banner
    matches: interactions.matches,
    haveMatches: interactions.haveMatches,
    haveNewMatches: interactions.haveNewMatches,
    haveReceivedLikes: interactions.haveReceivedLikes,
    haveSentLikes: interactions.haveSentLikes,
    receivedLikesCount: interactions.receivedLikesCount,
    newMatchesCount: interactions.newMatchesCount,
  }
}
