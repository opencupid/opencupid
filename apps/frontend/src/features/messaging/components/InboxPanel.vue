<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'

import { useMessageStore } from '../stores/messageStore'
import { useInboxRouteState } from '../composables/useInboxRouteState'

import MessagingView from './Messaging.vue'
import ConversationDetail from './ConversationDetail.vue'

defineOptions({ name: 'InboxPanel' })

const router = useRouter()
const messageStore = useMessageStore()
const { conversationId } = useInboxRouteState()

// Deep-link / route change: load thread when conversationId is present
watch(
  conversationId,
  async (id) => {
    if (id) {
      await messageStore.setActiveConversationById(id)
      setTimeout(() => messageStore.markAsRead(id), 2000)
    } else {
      messageStore.resetActiveConversation()
    }
  },
  { immediate: true }
)

async function onConvoSelect(id: string) {
  router.push({ name: 'Conversation', params: { conversationId: id } })
}

function onDeselectConvo() {
  router.push({ name: 'Inbox' })
}
</script>

<template>
  <MessagingView
    v-if="!conversationId"
    @convo:select="onConvoSelect"
  />
  <ConversationDetail
    v-else
    :loading="messageStore.isLoading"
    :conversation="messageStore.activeConversation"
    @deselect:convo="onDeselectConvo"
  />
</template>
