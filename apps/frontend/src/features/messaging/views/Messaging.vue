<script lang="ts" setup>
import type { ConversationSummary } from '@zod/messaging/messaging.dto'

import ConversationSummaries from '../components/ConversationSummaries.vue'
import EmptyView from '../components/EmptyView.vue'
import SendMessageDialog from '@/features/publicprofile/components/SendMessageDialog.vue'
import MatchesList from '@/features/interaction/components/MatchesList.vue'
import ReceivedLikesTeaser from '@/features/interaction/components/ReceivedLikesTeaser.vue'

import { useMessagingViewModel } from '../composables/useMessagingViewModel'

defineOptions({ name: 'Messaging' })

const emit = defineEmits<{
  (e: 'convo:select', conversationId: string): void
}>()

const {
  conversations,
  activeConversation,
  isLoading,
  haveConversations,
  isInitialized,
  handleMatchSelect,
  handleReceivedLikeSelect,
  handleMessageSent,
  matches,
  haveMatches,
  showEmptyState,
  showMessageModal,
  messageProfile,
} = useMessagingViewModel()

function handleSelectConvo(convo: ConversationSummary) {
  emit('convo:select', convo.conversationId)
}
</script>

<template>
  <div class="h-100 d-flex flex-column overflow-hidden">
    <div
      v-if="showEmptyState && isInitialized"
      class="flex-grow-1 d-flex flex-column justify-content-center overflow-auto hide-scrollbar"
    >
      <EmptyView />
    </div>
    <div
      v-else
      class="flex-grow-1 overflow-auto hide-scrollbar pt-2"
    >
      <template v-if="haveMatches">
        <p class="px-2 text-center">{{ $t('messaging.matches_list_title') }}</p>
        <div class="mb-3">
          <MatchesList
            :edges="matches"
            @select:profile="handleMatchSelect"
          />
        </div>
      </template>

      <div class="mb-3">
        <ReceivedLikesTeaser @interaction:selected="handleReceivedLikeSelect" />
      </div>

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
</template>
