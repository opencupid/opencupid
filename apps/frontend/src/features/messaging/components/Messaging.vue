<script lang="ts" setup>
import type { ConversationSummary } from '@zod/messaging/messaging.dto'

import ConversationSummaries from './ConversationSummaries.vue'
import EmptyView from './EmptyView.vue'
import SendMessageDialog from '@/features/publicprofile/components/SendMessageDialog.vue'
import MatchesList from '@/features/interaction/components/MatchesList.vue'
import ReceivedLikesTeaser from '@/features/interaction/components/ReceivedLikesTeaser.vue'
import DetailContainer from '@/features/browse/components/DetailContainer.vue'
import PublicProfileView from '@/features/publicprofile/components/PublicProfileView.vue'

import { useMessagingViewModel } from '../composables/useMessagingViewModel'
import { useNotificationState } from '@/features/app/composables/useNotificationState'
import { useRouter } from 'vue-router'
import { computed, onMounted } from 'vue'

defineOptions({ name: 'Messaging' })

const emit = defineEmits<{
  (e: 'convo:select', conversationId: string): void
}>()

const router = useRouter()

const { hasUnreadMessages, hasMatchNotifications } = useNotificationState()
const inboxUnreadCount = computed(() =>
  hasUnreadMessages.value || hasMatchNotifications.value ? '\u25CF' : ''
)

const {
  conversations,
  activeConversation,
  isLoading,
  haveConversations,
  isInitialized,
  initialize,
  fetchConversations,
  handleMatchSelect,
  handleReceivedLikeSelect,
  handleMessageSent,
  matches,
  haveMatches,
  showEmptyState,
  showMessageModal,
  messageProfile,
  viewingProfile,
} = useMessagingViewModel()

onMounted(async () => {
  await initialize()
  await fetchConversations()
})

function handleSelectConvo(convo: ConversationSummary) {
  emit('convo:select', convo.conversationId)
}
</script>

<template>
  <div class="h-100 d-flex flex-column overflow-hidden">
    <div class="offcanvas-header flex-shrink-0">
      <span
        id="ownerDrawerLabel"
        class="offcanvas-title"
      >
        {{ $t('messaging.my_conversations') }}
      </span>

      <button
        type="button"
        class="btn-close ms-auto"
        :aria-label="$t('common.close')"
        @click="router.back()"
      />
    </div>
    <div
      v-if="showEmptyState && isInitialized"
      class="flex-grow-1 d-flex flex-column justify-content-center overflow-auto hide-scrollbar"
    >
      <EmptyView />
    </div>
    <div
      v-else
      class="flex-grow-1 overflow-auto hide-scrollbar p-2"
    >
      <div class="mb-3">
        <ReceivedLikesTeaser @interaction:selected="handleReceivedLikeSelect" />
      </div>

      <template v-if="haveMatches">
        <MatchesList
          :edges="matches"
          @select:profile="handleMatchSelect"
        />
      </template>

      <div v-if="haveConversations">
        <ConversationSummaries
          :loading="isLoading"
          :conversations="conversations"
          :activeConversation="activeConversation"
          @convo:select="handleSelectConvo"
        />
      </div>
    </div>

    <SendMessageDialog
      v-if="messageProfile"
      v-model="showMessageModal"
      :profile="messageProfile"
      @sent="handleMessageSent"
    />
  </div>

  <!-- Profile viewer: opens alongside the inbox without closing it -->
  <Teleport
    defer
    v-if="viewingProfile"
    to="#app-detail"
  >
    <DetailContainer
      :open="true"
      @close="viewingProfile = null"
    >
      <template #header>{{ viewingProfile.publicName }}</template>
      <PublicProfileView :profile-id="viewingProfile.id" />
    </DetailContainer>
  </Teleport>
</template>
