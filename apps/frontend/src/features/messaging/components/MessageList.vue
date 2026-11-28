<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { type PublicImage } from '@zod/image/image.dto'
import { ref, shallowRef, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'
import BlurhashImage from '@/features/images/components/BlurhashImage.vue'
import FullscreenImageModal from '@/features/images/components/FullscreenImageModal.vue'

const props = defineProps<{
  messages: MessageDTO[]
  hasMore: boolean
  isLoadingMore: boolean
  editableMessageId?: string | null
}>()

const emit = defineEmits<{
  (e: 'load-older'): void
  (e: 'edit'): void
}>()

const fullscreenImage = shallowRef<PublicImage | null>(null)
const showFullscreen = shallowRef(false)

const openFullscreen = (image: PublicImage) => {
  fullscreenImage.value = image
  showFullscreen.value = true
}

// The list scrolls in a column-reverse container, so the browser measures the
// scroll position from the bottom: it opens at the latest message, and older
// pages prepended above leave the visible messages where they are.
const messageListRef = ref<HTMLElement | null>(null)

// Follow the conversation down when a new latest message arrives.
watch(
  () => props.messages[props.messages.length - 1]?.id,
  () => {
    if (messageListRef.value) messageListRef.value.scrollTop = 0
  },
  { flush: 'post' }
)

const handleScroll = () => {
  const container = messageListRef.value
  if (!container || props.isLoadingMore || !props.hasMore) return

  const distanceFromTop =
    container.scrollHeight - container.clientHeight - Math.abs(container.scrollTop)
  if (distanceFromTop <= 80) {
    emit('load-older')
  }
}
</script>

<template>
  <div
    class="p-2 mb-2 hide-scrollbar overflow-auto d-flex flex-column-reverse"
    ref="messageListRef"
    @scroll="handleScroll"
  >
    <!-- mb-auto keeps a short conversation at the top of the list -->
    <div class="d-flex flex-column mb-auto">
      <div
        v-if="isLoadingMore"
        class="text-center text-muted small py-2"
      >
        {{ $t('messaging.loading_older_messages') }}
      </div>
      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        :editable="msg.id === editableMessageId"
        class="mb-2 me-2 animate__animated animate__zoomIn"
        @image-click="openFullscreen"
        @edit="emit('edit')"
      />
    </div>

    <FullscreenImageModal v-model="showFullscreen">
      <div
        v-if="fullscreenImage"
        class="fullscreen-message-image h-100 bg-black"
        @click="showFullscreen = false"
      >
        <BlurhashImage
          :image="fullscreenImage"
          variant="full"
          imgClass="fitted-image"
        />
      </div>
    </FullscreenImageModal>
  </div>
</template>
