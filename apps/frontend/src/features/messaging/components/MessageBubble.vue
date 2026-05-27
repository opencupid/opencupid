<script setup lang="ts">
import { computed } from 'vue'
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import VoiceMessage from './VoiceMessage.vue'
import ImageTag from '@/features/images/components/ImageTag.vue'
import LocalizedTimeAgo from '@/features/shared/components/LocalizedTimeAgo.vue'
import { renderMessage } from '@/lib/renderMessage'

const props = defineProps<{
  message: MessageDTO
}>()

const hasImages = computed(() => (props.message.images?.length ?? 0) > 0)
const hasText = computed(() => (props.message.content ?? '').trim().length > 0)
const isVoice = computed(
  () => props.message.messageType === 'audio/voice' && !!props.message.attachment
)
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
      v-if="isVoice"
      :attachment="message.attachment!"
      :is-mine="message.isMine"
    />

    <template v-else>
      <!-- Image attachments (1-4 per backend cap) -->
      <div
        v-if="hasImages"
        class="message-images d-flex flex-column gap-1"
        :class="{ 'mb-1': hasText }"
      >
        <ImageTag
          v-for="img in message.images"
          :key="img.position"
          :image="img"
          variant="card"
          loading="lazy"
          className="message-image"
        />
      </div>

      <!-- Text message / caption -->
      <div
        v-if="hasText || !hasImages"
        class="message-text"
      >
        <span v-html="renderMessage(message.content)" />
      </div>
    </template>

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

.message-images :deep(.message-image) {
  width: 100%;
  height: auto;
  max-height: 60vh;
  object-fit: contain;
  object-position: left center;
  border-radius: 0.5rem;
}
</style>
