
import { computed, reactive, readonly, ref, watch } from 'vue';
import { useFindProfilesStore } from '@/features/browse/stores/findProfilesStore';
import { useProfileStore } from '@/store/profileStore';
import type { ProfileScope, OwnerProfile } from '@zod/profile/profile.dto';
import { type StoreError } from '@/store/helpers';


export function useFindMatchViewModel() {

  const profileStore = useProfileStore()
  const findProfilesStore = useFindProfilesStore()

  const me = reactive({} as OwnerProfile)

  const error = ref<StoreError | null>(null)

  const initialize = async (defaultScope?: ProfileScope) => {
    console.log('Initializing FindMatchViewModel with defaultScope:', defaultScope)
    const meRes = await profileStore.fetchOwnerProfile()
    if (!meRes.success) {
      error.value = meRes
      return
    }
    Object.assign(me, profileStore.profile)
    await findProfilesStore.initialize(me, defaultScope)
  }

  const haveAccess = computed(() => {
    if (findProfilesStore.currentScope === 'social') {
      return me.isSocialActive
    } else if (findProfilesStore.currentScope === 'dating') {
      return me.isDatingActive
    }
    return false
  })

  const haveResults = computed(() => {
    return findProfilesStore.profileList.length > 0 && haveAccess.value
  })

  const isLoading = computed(() => {
    return findProfilesStore.isLoading || profileStore.isLoading
  })

  return {
    me: readonly(me),
    haveResults,
    haveAccess,
    isLoading,
    error,
    initialize,
    findProfilesStore,
  }


}