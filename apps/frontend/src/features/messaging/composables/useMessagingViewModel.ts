import { computed, onUnmounted, ref } from 'vue'
import { whenever } from '@vueuse/core'
import { useRouter } from 'vue-router'

import type { ConversationSummary } from '@zod/messaging/messaging.dto'
import type { PublicProfileWithContext } from '@zod/profile/profile.dto'
import type { ReceivedLike } from '@zod/interaction/interaction.dto'

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

  // Send message dialog state
  const showMessageModal = ref(false)
  const messageProfile = ref<PublicProfileWithContext>()

  const viewingProfile = ref<PublicProfileWithContext | null>(null)

  const handleProfileSelect = async (profileId: string) => {
    const res = await fetchProfile(profileId)
    if (!res?.success) return
    viewingProfile.value = res.data ?? null
  }

  const handleMatchSelect = async (profileId: string) => {
    const res = await fetchProfile(profileId)
    if (!res?.success) return
    messageProfile.value = res.data
    showMessageModal.value = true
  }

  const handleReceivedLikeSelect = async (like: ReceivedLike) => {
    if (!like.profile) return
    handleProfileSelect(like.profile.id)
  }

  const handleMessageSent = () => {
    messageStore.fetchConversations()
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
    handleReceivedLikeSelect,
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

    // Profile viewer (opened from inbox list, e.g. received likes)
    viewingProfile,
    handleProfileSelect,
  }
}
