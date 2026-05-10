import { computed } from 'vue'
import { useRoute } from 'vue-router'

export type ProfileSubView =
  | 'myprofile'
  | 'myposts'
  | 'editpost'
  | 'editevent'
  | 'settings'
  | 'datingprefs'
  | 'datingwizard'

const MY_PROFILE_ROUTES = new Set([
  'Me',
  'MePosts',
  'MeCreatePost',
  'MeEditPost',
  'MeCreateEvent',
  'MeEditEvent',
  'MeSettings',
  'MeDating',
  'MeDatingWizard',
])

export function useMyProfileRouteState() {
  const route = useRoute()

  const isActive = computed(() => MY_PROFILE_ROUTES.has(route.name as string))

  const subView = computed((): ProfileSubView => {
    switch (route.name) {
      case 'MePosts':
        return 'myposts'
      case 'MeCreatePost':
      case 'MeEditPost':
        return 'editpost'
      case 'MeCreateEvent':
      case 'MeEditEvent':
        return 'editevent'
      case 'MeSettings':
        return 'settings'
      case 'MeDating':
        return 'datingprefs'
      case 'MeDatingWizard':
        return 'datingwizard'
      default:
        return 'myprofile'
    }
  })

  const editingPostId = computed(() =>
    route.name === 'MeEditPost' ? (route.params.postId as string) : undefined
  )

  const editingEventId = computed(() =>
    route.name === 'MeEditEvent' ? (route.params.eventId as string) : undefined
  )

  return { isActive, subView, editingPostId, editingEventId }
}
