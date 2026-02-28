import { computed, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'

import type { ConversationSummary } from '@zod/messaging/messaging.dto'
import type { ProfileSummary } from '@zod/profile/profile.dto'

import { useBootstrap } from '@/lib/bootstrap'
import { useMessageStore } from '../stores/messageStore'
import { useInteractionsViewModel } from '@/features/interaction/composables/useInteractionsViewModel'

export function useMessagingViewModel(conversationId: Ref<string | undefined>) {
  const router = useRouter()
  const messageStore = useMessageStore()
  const interactions = useInteractionsViewModel()

  const isInitialized = ref(false)

  watch(
    conversationId,
    async (newId, oldId) => {
      if (newId !== oldId) {
        if (!newId) {
          await messageStore.setActiveConversation(null)
        } else {
          await messageStore.setActiveConversationById(newId)
        }
      }
    },
    { immediate: true }
  )

  const initialize = async () => {
    await useBootstrap().bootstrap()
    await messageStore.fetchConversations()
    isInitialized.value = true
    if (conversationId.value) {
      await messageStore.setActiveConversationById(conversationId.value)
    }
  }

  const reset = () => {
    messageStore.setActiveConversation(null)
  }

  const handleSelectConvo = async (convo: ConversationSummary) => {
    if (messageStore.activeConversation?.conversationId === convo.conversationId) {
      return
    }
    router.push({ name: 'Messaging', params: { conversationId: convo.conversationId } })
    setTimeout(async () => {
      await messageStore.markAsRead(convo.conversationId)
    }, 2000)
  }

  const handleDeselectConvo = async () => {
    router.back()
    messageStore.resetActiveConversation()
  }

  const handleProfileSelect = (profile: ProfileSummary | string) => {
    const profileId = typeof profile === 'string' ? profile : profile.id
    router.push({ name: 'PublicProfile', params: { profileId } })
  }

  const haveConversations = computed(() => messageStore.conversations.length > 0)
  const isDetailView = computed(() => !!messageStore.activeConversation)

  return {
    // Store state
    conversations: computed(() => messageStore.conversations),
    activeConversation: computed(() => messageStore.activeConversation),
    isLoading: computed(() => messageStore.isLoading),

    // Computed
    haveConversations,
    isDetailView,
    isInitialized,

    // Handlers
    handleSelectConvo,
    handleDeselectConvo,
    handleProfileSelect,
    fetchConversations: () => messageStore.fetchConversations(),

    // Lifecycle
    initialize,
    reset,

    // Interactions (matches/likes)
    matches: interactions.matches,
    haveMatches: interactions.haveMatches,
  }
}
