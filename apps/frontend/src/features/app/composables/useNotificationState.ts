import { computed } from 'vue'
import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { useInteractionStore } from '@/features/interaction/stores/useInteractionStore'

export function useNotificationState() {
  const messageStore = useMessageStore()
  const interactionStore = useInteractionStore()

  const hasUnreadMessages = computed(() => messageStore.hasUnreadMessages)
  const hasMatchNotifications = computed(
    () => interactionStore.newMatchesCount > 0 || interactionStore.receivedLikes.length > 0
  )
  const hasNotifications = computed(() => hasUnreadMessages.value || hasMatchNotifications.value)

  return { hasUnreadMessages, hasMatchNotifications, hasNotifications }
}
