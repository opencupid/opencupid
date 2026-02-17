<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import VoiceMessage from './VoiceMessage.vue'

const props = defineProps<{
  messages: MessageDTO[]
  hasMore: boolean
  isLoadingOlder: boolean
}>()

const emit = defineEmits<{
  loadOlder: []
}>()

const messageListRef = ref<HTMLElement | null>(null)
const loadTriggered = ref(false)

function scrollToBottom() {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

function onScroll() {
  const el = messageListRef.value
  if (!el || !props.hasMore || props.isLoadingOlder || loadTriggered.value) return
  if (el.scrollTop < 80) {
    loadTriggered.value = true
    emit('loadOlder')
  }
}

watch(
  () => props.isLoadingOlder,
  loading => {
    if (!loading) loadTriggered.value = false
  }
)

onMounted(() => {
  scrollToBottom()
  messageListRef.value?.addEventListener('scroll', onScroll)
})

onUnmounted(() => {
  messageListRef.value?.removeEventListener('scroll', onScroll)
})

watch(
  () => props.messages,
  async (newMsgs, oldMsgs) => {
    const el = messageListRef.value
    if (!el) return

    // If older messages were prepended, restore scroll position
    if (
      oldMsgs &&
      newMsgs.length > oldMsgs.length &&
      oldMsgs[0] &&
      newMsgs[0]?.id !== oldMsgs[0].id
    ) {
      const prevScrollHeight = el.scrollHeight
      await nextTick()
      el.scrollTop = el.scrollHeight - prevScrollHeight
    } else {
      // New message appended — scroll to bottom
      await nextTick()
      el.scrollTo({ top: el.scrollHeight })
    }
  },
  { deep: false }
)
</script>

<template>
  <div class="p-2 mb-2 hide-scrollbar overflow-auto d-flex flex-column" ref="messageListRef">
    <div v-if="isLoadingOlder" class="text-center py-2">
      <div class="spinner-border spinner-border-sm text-secondary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
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
