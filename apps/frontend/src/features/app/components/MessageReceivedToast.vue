<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { computed } from 'vue'
defineEmits<{
  (e: 'closeToast'): void
}>()

const props = defineProps<{
  message: MessageDTO
  toastId: number | string
}>()

// vue-toastification renders toasts outside the app's component tree,
// so useI18n() fails. Use the global i18n instance directly.
const t = window.__APP_I18N__!.global.t

// Clean message for toast display: strip HTML tags, convert <br> to spaces, truncate
const cleanMessageContent = computed(() => {
  if (props.message.messageType === 'audio/voice') {
    return t('messaging.voice.voice_message_notification')
  }

  let cleaned = props.message.content
    .replace(/<br\s*\/?>/gi, ' ') // Replace <br> with spaces
    .replace(/<[^>]+>/g, '') // Strip other HTML tags
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()

  // Truncate at 100 chars, breaking at word boundary
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 100)
    // Find last space to break at word boundary
    const lastSpace = cleaned.lastIndexOf(' ')
    if (lastSpace > 80) {
      // Only break at word if we're close enough
      cleaned = cleaned.substring(0, lastSpace)
    }
    cleaned += '...'
  }

  return cleaned
})
</script>

<template>
  <div class="d-flex align-items-start clickable">
    <div class="profile-thumbnail me-2 flex-shrink-0">
      <img
        v-if="message.sender.thumbnail"
        :src="message.sender.thumbnail.url"
        :alt="message.sender.publicName"
        class="fitted-image rounded"
      />
    </div>
    <div class="flex-grow-1 overflow-hidden">
      <div class="fw-bold">
        {{ message.sender.publicName || $t('messaging.unknown_sender') }}
      </div>
      <div class="text-wrap">
        {{ cleanMessageContent }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.fitted-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
}
</style>
