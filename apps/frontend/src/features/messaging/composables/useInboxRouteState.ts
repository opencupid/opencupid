import { computed } from 'vue'
import { useRoute } from 'vue-router'

export type InboxMode = 'list' | 'detail' | 'draft'

export function useInboxRouteState() {
  const route = useRoute()

  const mode = computed<InboxMode | null>(() => {
    if (route.name === 'Conversation') return 'detail'
    if (route.name === 'ConversationNew') return 'draft'
    if (route.name === 'Inbox') return 'list'
    return null
  })

  const isActive = computed(() => mode.value !== null)

  const conversationId = computed(() =>
    route.name === 'Conversation' ? (route.params.conversationId as string) : undefined
  )

  const partnerProfileId = computed(() =>
    route.name === 'ConversationNew' ? (route.params.profileId as string) : undefined
  )

  return { isActive, mode, conversationId, partnerProfileId }
}
