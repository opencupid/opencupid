import { computed, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'

import type { ConversationSummary } from '@zod/messaging/messaging.dto'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'

import { useBootstrap } from '@/lib/bootstrap'
import { useMessageStore } from '../stores/messageStore'
import { useInteractionsViewModel } from '@/features/interaction/composables/useInteractionsViewModel'
import { usePublicProfile } from '@/features/publicprofile/composables/usePublicProfile'

export function useMessagingViewModel(conversationId: Ref<string | undefined>) {
  const router = useRouter()
  const messageStore = useMessageStore()
  const interactions = useInteractionsViewModel()
  const { fetchProfile } = usePublicProfile()

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

  // Send message dialog state
  const showMessageModal = ref(false)
  const messageProfile = ref<PublicProfileWithContext>()

  const handleProfileSelect = async (profileId: string) => {
    const res = await fetchProfile(profileId)
    if (!res?.success) return
    messageProfile.value = res.data
    showMessageModal.value = true
  }

  const handleMessageSent = () => {
    messageStore.fetchConversations()
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
    handleMessageSent,
    fetchConversations: () => messageStore.fetchConversations(),

    // Send message dialog
    showMessageModal,
    messageProfile,

    // Lifecycle
    initialize,

    // Interactions (matches/likes)
    matches: interactions.matches,
    haveMatches: interactions.haveMatches,
  }
}
