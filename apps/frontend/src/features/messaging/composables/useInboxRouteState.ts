import { computed } from 'vue'
import { useRoute } from 'vue-router'

export function useInboxRouteState() {
  const route = useRoute()

  const isActive = computed(() => route.name === 'Inbox' || route.name === 'Conversation')

  const conversationId = computed(() =>
    route.name === 'Conversation' ? (route.params.conversationId as string) : undefined
  )

  return { isActive, conversationId }
}
