<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { nextTick, ref, watch } from 'vue'
import VoiceMessage from './VoiceMessage.vue'

const props = defineProps<{
  messages: MessageDTO[]
  hasMore: boolean
  isLoadingMore: boolean
}>()

const emit = defineEmits<{
  (e: 'load-older'): void
}>()

const messageListRef = ref<HTMLElement | null>(null)
const previousMessageCount = ref(0)
const hasDoneInitialScroll = ref(false)

const scrollToBottom = () => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

watch(
  () => props.messages,
  async (newMessages, oldMessages) => {
    const container = messageListRef.value
    if (!container) return

    const oldLength = oldMessages?.length ?? previousMessageCount.value
    const newLength = newMessages.length
    const prependedMessages = newLength > oldLength && oldMessages && newMessages[newLength - 1]?.id === oldMessages[oldLength - 1]?.id

    if (!hasDoneInitialScroll.value && newLength === 0) {
      previousMessageCount.value = newLength
      return
    }

    if (prependedMessages) {
      const previousHeight = container.scrollHeight
      await nextTick()
      const nextHeight = container.scrollHeight
      container.scrollTop += nextHeight - previousHeight
    } else {
      await nextTick()
      scrollToBottom()
      hasDoneInitialScroll.value = true
    }

    previousMessageCount.value = newLength
  },
  {
    deep: true,
    immediate: true,
  }
)

const handleScroll = () => {
  if (!messageListRef.value || props.isLoadingMore || !props.hasMore) return

  if (messageListRef.value.scrollTop <= 80) {
    emit('load-older')
  }
}
</script>

<template>
  <div class="p-2 mb-2 hide-scrollbar overflow-auto d-flex flex-column" ref="messageListRef" @scroll="handleScroll">
    <div v-if="isLoadingMore" class="text-center text-muted small py-2">Loading older messages…</div>
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="message mb-2 me-2 text-wrap animate__animated animate__zoomIn user-select-none"
      :class="{
        'bg-info align-self-start': !msg.isMine,
        'bg-secondary align-self-end': msg.isMine,
      }"
    >
      <!-- Voice message -->
      <VoiceMessage 
        v-if="msg.messageType === 'audio/voice' && msg.attachment"
        :attachment="msg.attachment"
        :is-mine="msg.isMine"
      />
      
      <!-- Text message -->
      <div v-else v-html="msg.content" />
    </div>
  </div>
</template>

<style scoped>
.message {
  max-width: 50%;
  border-radius: 15px;
  word-break: break-word;
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
  color: white;
}
</style>
