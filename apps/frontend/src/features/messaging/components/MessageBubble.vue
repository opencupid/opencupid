<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import VoiceMessage from './VoiceMessage.vue'
import LocalizedTimeAgo from '@/features/shared/components/LocalizedTimeAgo.vue'
import { renderMessage } from '@/lib/renderMessage'

defineProps<{
  message: MessageDTO
}>()
</script>

<template>
  <div
    class="message-bubble text-wrap user-select-none"
    :class="{
      'bg-info align-self-start': !message.isMine,
      'bg-secondary align-self-end': message.isMine,
    }"
  >
    <!-- Voice message -->
    <VoiceMessage
      v-if="message.messageType === 'audio/voice' && message.attachment"
      :attachment="message.attachment"
      :is-mine="message.isMine"
    />

    <!-- Text message -->
    <div
      v-else
      class="message-text"
    >
      <span v-html="renderMessage(message.content)" />
    </div>

    <div
      class="message-timestamp"
      :class="message.isMine ? 'text-end' : 'text-start'"
    >
      <LocalizedTimeAgo :time="new Date(message.createdAt)" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-bubble {
  max-width: 80%;
  border-radius: 15px;
  word-break: break-word;
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
  color: white;
}

.message-text p {
  margin: 0 0 0 1rem;
}

.message-text :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.message-timestamp {
  font-size: 0.65rem;
  opacity: 0.7;
}
</style>
