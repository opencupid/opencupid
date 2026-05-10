import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function useDetailRouteState() {
  const route = useRoute()

  const detail = computed(() => {
    if (route.name === 'PublicProfile')
      return { type: 'profile' as const, id: route.params.profileId as string }
    if (route.name === 'PublicPost')
      return { type: 'post' as const, id: route.params.postId as string }
    if (route.name === 'PublicEvent')
      return { type: 'event' as const, id: route.params.eventId as string }
    return null
  })

  return { detail }
}
