import { useProfileStore } from "@/store/profileStore"
import { PublicProfileWithContext } from "@zod/profile/profile.dto"
import { computed, reactive, ref } from "vue"

export function usePublicProfile() {

  const store = useProfileStore()
  const id = ref<string | null>(null)
  const profile = reactive<PublicProfileWithContext>({} as PublicProfileWithContext)
  const error = ref('')

  const fetchProfile = async (profileId: string) => {
    id.value = profileId
    await refreshProfile()
  }

  const refreshProfile = async () => {
    if (!id.value) return
    const res = await store.getPublicProfile(id.value)
    if (!res.success) {
      error.value = res.message
      return
    }
    Object.assign(profile, res.data)
  }

  return {
    profile: computed(() => profile),
    isLoading: store.isLoading,
    error,
    fetchProfile,
    refreshProfile,
  }
}