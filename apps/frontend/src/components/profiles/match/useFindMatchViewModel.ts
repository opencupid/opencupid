
import { useFindProfilesStore } from '@/store/findProfilesStore';
import { useProfileStore } from '@/store/profileStore';
import { OwnerProfile } from '@zod/profile/profile.dto';
import { computed, reactive, readonly, ref } from 'vue';
import { type FindMatchViewModel } from './types';


export function useFindMatchViewModel() {

  const profileStore = useProfileStore()
  const findProfilesStore = useFindProfilesStore()

  const me = reactive({} as OwnerProfile)
  const vm = reactive({
    scopes: [],
    currentScope: null
  } as FindMatchViewModel)

  const error = ref<string | null>('')

  const initialize = async () => {
    const meRes = await profileStore.fetchOwnerProfile()
    if (!meRes.success || !profileStore.profile) {
      error.value = 'Could not load profile'
      return
    }
    Object.assign(me, profileStore.profile)

    vm.scopes = [
      ...(me.isSocialActive ? (['social'] as const) : []),
      ...(me.isDatingActive ? (['dating'] as const) : []),
    ]
    vm.currentScope = vm.scopes.length > 0 ? vm.scopes[0] : null

    await findProfilesStore.fetchDatingPrefs()
    await findProfilesStore.findProfiles()
  }

  const haveResults = computed(() => {
    return findProfilesStore.profileList.length > 0
  })
  // const results = computed(() => findProfilesStore.profileList)
  // const datingPrefs = computed(() => findProfilesStore.datingPrefs)

  return {
    vm: vm,
    me: readonly(me),
    haveResults,
    error,
    initialize,
    findProfilesStore,
  }


}