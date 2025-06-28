import { computed, reactive, ref } from "vue"

import { type StoreError } from "@/store/helpers"
import { PublicProfileResponse, useProfileStore } from "@/store/profileStore"
import { PublicProfileWithContext } from "@zod/profile/profile.dto"

export function usePublicProfile() {

  const store = useProfileStore()
  const id = ref<string | null>(null)
  const profile = reactive<PublicProfileWithContext>({} as PublicProfileWithContext)
  const error = ref<StoreError | null>(null)

  const fetchProfile = async (profileId: string) => {
    // no profile ID, 404
    if (!profileId) {
      Object.assign(profile, {} as PublicProfileWithContext)
      error.value = {
        success: false,
        message: 'Profile not found',
        status: 404,
        fieldErrors: {},
      }
      return
    }

    id.value = profileId
    return await refreshProfile()
  }

  const refreshProfile = async () => {
    const res = await store.getPublicProfile(id.value!)
    if (res.success) {
      Object.assign(profile, res.data)
      error.value = null
    } else {
      Object.assign(profile, {} as PublicProfileWithContext)
      error.value = res
    }
    return res
  }

  const blockProfile = async () => {
    const res = await store.blockProfile(id.value!)
    return res.success
  }

  return {
    profile: computed(() => profile),
    isLoading: store.isLoading,
    error,
    blockProfile,
    fetchProfile,
    refreshProfile,
  }
}