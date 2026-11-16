<script lang="ts" setup>
import type { ConversationSummary } from '@zod/messaging/messaging.dto'

import ConversationSummaries from './ConversationSummaries.vue'
import EmptyView from './EmptyView.vue'
import MatchesList from '@/features/interaction/components/MatchesList.vue'
import ReceivedLikesTeaser from '@/features/interaction/components/ReceivedLikesTeaser.vue'
import PublicProfileView from '@/features/publicprofile/components/PublicProfileView.vue'

import { useMessagingViewModel } from '../composables/useMessagingViewModel'
import { useNotificationState } from '@/features/app/composables/useNotificationState'
import { useDetailPanel } from '@/features/app/composables/useDetailPanel'
import { useRouter } from 'vue-router'
import { computed, onMounted, ref } from 'vue'
import { useInfiniteScroll } from '@vueuse/core'
import type { ReceivedLike } from '@zod/interaction/interaction.dto'

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
  fetchMoreConversations,
  canLoadMoreConversations,
  isLoadingMoreConversations,
  handleMatchSelect,
  handleProfileSelect,
  matches,
  haveMatches,
  showEmptyState,
} = useMessagingViewModel()

const panel = useDetailPanel()

// Click on a "received like" → fetch profile + push into the global detail panel.
async function onReceivedLikeSelect(like: ReceivedLike) {
  if (!like.profile) return
  const profile = await handleProfileSelect(like.profile.id)
  if (profile) panel.show(PublicProfileView, { profileId: profile.id })
}

// Conversations are paged in as the list nears its end.
const scrollEl = ref<HTMLElement | null>(null)
useInfiniteScroll(scrollEl, fetchMoreConversations, {
  distance: 300,
  canLoadMore: () => canLoadMoreConversations.value,
})

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
        @click="router.replace({ name: 'Browse' })"
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
      ref="scrollEl"
      class="flex-grow-1 overflow-auto hide-scrollbar p-2"
    >
      <div class="mb-3">
        <ReceivedLikesTeaser @interaction:selected="onReceivedLikeSelect" />
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
          :loading-more="isLoadingMoreConversations"
          :conversations="conversations"
          :activeConversation="activeConversation"
          @convo:select="handleSelectConvo"
        />
      </div>
    </div>
  </div>

  <!-- Detail panel content is pushed into DetailPanelOrchestrator
       imperatively via useDetailPanel() — see watcher in script. -->
</template>
