<script setup lang="ts">
import { computed } from 'vue'
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { type PublicImage } from '@zod/image/image.dto'
import VoiceMessage from './VoiceMessage.vue'
import ImageTag from '@/features/images/components/ImageTag.vue'
import LocalizedTimeAgo from '@/features/shared/components/LocalizedTimeAgo.vue'
import { renderMessage } from '@/lib/renderMessage'
import IconEdit from '@/assets/icons/interface/pencil-2.svg'

const props = defineProps<{
  message: MessageDTO
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'image-click', image: PublicImage): void
  (e: 'edit'): void
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
        <button
          v-for="img in message.images"
          :key="img.position"
          type="button"
          class="message-image-button"
          :aria-label="$t('messaging.open_photo')"
          @click="emit('image-click', img)"
        >
          <ImageTag
            :image="img"
            variant="card"
            loading="lazy"
            className="message-image"
          />
        </button>
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
      <span
        v-if="message.editedAt"
        data-testid="message-edited"
      >
        · {{ $t('messaging.edited') }}
      </span>
    </div>

    <button
      v-if="editable"
      type="button"
      class="message-edit-button btn btn-link p-1 text-body"
      data-testid="message-edit-button"
      :title="$t('messaging.edit_message')"
      :aria-label="$t('messaging.edit_message')"
      @click="emit('edit')"
    >
      <IconEdit class="svg-icon" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.message-bubble {
  position: relative;
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

.message-edit-button {
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-right: 0.25rem;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s;
}

.message-bubble:hover .message-edit-button,
.message-edit-button:focus-visible {
  opacity: 0.7;
}

// No hover on touch screens: keep the button visible.
@media (hover: none) {
  .message-edit-button {
    opacity: 0.5;
  }
}

.message-image-button {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
}
</style>
