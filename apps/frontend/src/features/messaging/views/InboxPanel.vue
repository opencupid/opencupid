<script setup lang="ts">
import { ref, watch } from 'vue'

import { useMessageStore } from '../stores/messageStore'

import MessagingView from './Messaging.vue'
import ConversationDetail from '../components/ConversationDetail.vue'

defineOptions({ name: 'InboxPanel' })

const props = defineProps<{
  conversationId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const messageStore = useMessageStore()
const subView = ref<'list' | 'thread'>('list')

// Deep-link: jump straight to thread when conversationId arrives
watch(
  () => props.conversationId,
  async (id) => {
    if (id) {
      await messageStore.setActiveConversationById(id)
      subView.value = 'thread'
    }
  },
  { immediate: true }
)

async function onConvoSelect(conversationId: string) {
  await messageStore.setActiveConversationById(conversationId)
  subView.value = 'thread'
  setTimeout(() => messageStore.markAsRead(conversationId), 2000)
}

function onDeselectConvo() {
  messageStore.resetActiveConversation()
  subView.value = 'list'
}
</script>

<template>
  <MessagingView
    v-if="subView === 'list'"
    @convo:select="onConvoSelect"
    @close="emit('close')"
  />
  <ConversationDetail
    v-else
    :loading="messageStore.isLoading"
    :conversation="messageStore.activeConversation"
    @deselect:convo="onDeselectConvo"
    @close="emit('close')"
  />
</template>
