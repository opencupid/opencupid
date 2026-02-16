<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { nextTick, onMounted, ref, watch } from 'vue'
import VoiceMessage from './VoiceMessage.vue'

const props = defineProps<{
  messages: MessageDTO[]
  hasMore: boolean
  isLoadingOlder: boolean
}>()

const emit = defineEmits<{
  (e: 'load:older'): void
}>()

const messageListRef = ref<HTMLElement | null>(null)
const loadThreshold = 80

const scrollToBottom = () => {
  if (!messageListRef.value) return
  messageListRef.value.scrollTop = messageListRef.value.scrollHeight
}

const isNearBottom = () => {
  if (!messageListRef.value) return true
  const el = messageListRef.value
  return el.scrollHeight - (el.scrollTop + el.clientHeight) < 80
}

onMounted(() => {
  scrollToBottom()
})

watch(
  () => props.messages.map(message => message.id),
  async (newIds, oldIds = []) => {
    const el = messageListRef.value
    const previousScrollHeight = el?.scrollHeight ?? 0
    const previousScrollTop = el?.scrollTop ?? 0
    const shouldStickToBottom = isNearBottom()

    const oldFirstId = oldIds[0]
    const oldLastId = oldIds[oldIds.length - 1]
    const newFirstId = newIds[0]
    const newLastId = newIds[newIds.length - 1]

    const prependedOlderMessages =
      !!oldIds.length &&
      newIds.length > oldIds.length &&
      oldFirstId !== newFirstId &&
      oldLastId === newLastId

    const appendedNewMessage =
      !!oldIds.length &&
      newIds.length > oldIds.length &&
      oldLastId !== newLastId

    await nextTick()

    if (!messageListRef.value) return

    if (!oldIds.length && newIds.length) {
      scrollToBottom()
      return
    }

    if (prependedOlderMessages) {
      const newScrollHeight = messageListRef.value.scrollHeight
      messageListRef.value.scrollTop = newScrollHeight - previousScrollHeight + previousScrollTop
      return
    }

    if (appendedNewMessage && shouldStickToBottom) {
      scrollToBottom()
    }
  },
)

const handleScroll = () => {
  const el = messageListRef.value
  if (!el) return

  if (
    el.scrollTop <= loadThreshold &&
    props.hasMore &&
    !props.isLoadingOlder
  ) {
    emit('load:older')
  }
}
</script>

<template>
  <div
    class="p-2 mb-2 hide-scrollbar overflow-auto d-flex flex-column"
    ref="messageListRef"
    @scroll="handleScroll"
  >
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
