import { computed, onUnmounted, ref } from 'vue'
import { whenever } from '@vueuse/core'
import { useRouter } from 'vue-router'

import type { ConversationSummary } from '@zod/messaging/messaging.dto'
import type { PublicProfile } from '@zod/profile/profile.dto'

import { useBootstrap } from '@/lib/bootstrap'
import { useMessageStore } from '../stores/messageStore'
import { useInteractionsViewModel } from '@/features/interaction/composables/useInteractionsViewModel'
import { usePublicProfile } from '@/features/publicprofile/composables/usePublicProfile'

export function useMessagingViewModel() {
  const router = useRouter()
  const messageStore = useMessageStore()
  const interactions = useInteractionsViewModel()
  const { fetchProfile } = usePublicProfile()

  const isInitialized = ref(false)

  // bootstrap fires messageStore.initialize() and interactionStore.initialize()
  // as fire-and-forget; reactively wait for both to complete
  whenever(
    () => messageStore.initialized && interactions.isInitialized.value,
    () => {
      isInitialized.value = true
    },
    { immediate: true, once: true }
  )

  const initialize = async () => {
    await useBootstrap().bootstrap()
    messageStore.suppressMessageNotifications = true
  }

  onUnmounted(() => {
    messageStore.suppressMessageNotifications = false
  })

  const handleSelectConvo = async (convo: ConversationSummary) => {
    if (messageStore.activeConversation?.conversationId === convo.conversationId) {
      return
    }
    router.push({ name: 'Conversation', params: { conversationId: convo.conversationId } })
    setTimeout(async () => {
      await messageStore.markAsRead(convo.conversationId)
    }, 2000)
  }

  // Fetch a public profile by id. Returns the profile or null on failure.
  // Consumers decide what to do with the result (e.g. push into the detail panel).
  const handleProfileSelect = async (profileId: string): Promise<PublicProfile | null> => {
    const res = await fetchProfile(profileId)
    if (!res?.success) return null
    return res.data ?? null
  }

  // Open the conversation-detail view for a match. The ConversationNew route
  // resolves the convo (existing or draft) via useConversationDetailViewModel.
  const handleMatchSelect = (profileId: string) => {
    router.push({ name: 'ConversationNew', params: { profileId } })
  }

  const haveConversations = computed(() => messageStore.conversations.length > 0)
  const showEmptyState = computed(
    () =>
      !haveConversations.value &&
      !interactions.haveMatches.value &&
      !interactions.haveReceivedLikes.value
  )

  return {
    // Store state
    conversations: computed(() => messageStore.conversations),
    activeConversation: computed(() => messageStore.activeConversation),
    isLoading: computed(() => messageStore.isLoading),

    // Computed
    haveConversations,
    isInitialized,
    showEmptyState,

    // Handlers
    handleSelectConvo,
    handleMatchSelect,
    fetchConversations: () => messageStore.fetchConversations(),

    // Lifecycle
    initialize,

    // Interactions (matches/likes)
    matches: interactions.matches,
    haveMatches: interactions.haveMatches,

    // Profile fetch helper (consumer decides what to do with the result —
    // typically push into the global detail panel via useDetailPanel)
    handleProfileSelect,
  }
}
