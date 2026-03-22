<script setup lang="ts">
import { ref } from 'vue'
import type { MessageAttachmentDTO } from '@zod/messaging/messaging.dto'

const props = defineProps<{
  attachment: MessageAttachmentDTO
  isMine?: boolean
}>()

const showLightbox = ref(false)
</script>

<template>
  <div class="image-message">
    <!-- Inline thumbnail — click to open lightbox -->
    <img
      :src="attachment.url"
      :alt="$t('messaging.image_message_alt')"
      class="image-message__inline"
      @click="showLightbox = true"
    />

    <!-- Fullscreen lightbox modal -->
    <BModal
      v-model:show="showLightbox"
      size="xl"
      centered
      hide-footer
      :title="$t('messaging.image_message_alt')"
      body-class="p-0 d-flex align-items-center justify-content-center"
    >
      <img
        :src="attachment.fullUrl ?? attachment.url"
        :alt="$t('messaging.image_message_alt')"
        class="image-message__full"
      />
    </BModal>
  </div>
</template>

<style scoped>
.image-message__inline {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
  display: block;
  object-fit: cover;
}

.image-message__full {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
}
</style>
