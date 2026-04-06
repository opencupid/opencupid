import { computed } from 'vue'
import { useDetailRouteState } from '@/features/shared/composables/useDetailRouteState'
import { useMyProfileRouteState } from '@/features/myprofile/composables/useMyProfileRouteState'
import { useInboxRouteState } from '@/features/messaging/composables/useInboxRouteState'

export function useAppShellState() {
  const myProfile = useMyProfileRouteState()
  const inbox = useInboxRouteState()
  const { detail } = useDetailRouteState()

  const drawerType = computed((): 'profile' | 'inbox' | null => {
    if (myProfile.isActive.value) return 'profile'
    if (inbox.isActive.value) return 'inbox'
    return null
  })

  return { drawerType, myProfile, inbox, detail }
}
