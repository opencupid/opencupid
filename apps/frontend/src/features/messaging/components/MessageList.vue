<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { type PublicImage } from '@zod/image/image.dto'
import { nextTick, ref, shallowRef, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'
import BlurhashImage from '@/features/images/components/BlurhashImage.vue'
import FullscreenImageModal from '@/features/images/components/FullscreenImageModal.vue'

const props = defineProps<{
  messages: MessageDTO[]
  hasMore: boolean
  isLoadingMore: boolean
}>()

const emit = defineEmits<{
  (e: 'load-older'): void
}>()

const fullscreenImage = shallowRef<PublicImage | null>(null)
const showFullscreen = shallowRef(false)

const openFullscreen = (image: PublicImage) => {
  fullscreenImage.value = image
  showFullscreen.value = true
}

const messageListRef = ref<HTMLElement | null>(null)
const previousMessageCount = ref(0)
const hasDoneInitialScroll = ref(false)

const scrollToBottom = () => {
  if (!messageListRef.value) return
  // Double rAF: first frame lets the browser complete layout after Vue's DOM update,
  // second frame ensures flex containers have settled their final dimensions.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (messageListRef.value) {
        messageListRef.value.scrollTop = messageListRef.value.scrollHeight
      }
    })
  })
}

watch(
  () => props.messages,
  async (newMessages, oldMessages) => {
    const container = messageListRef.value
    if (!container) return

    const oldLength = oldMessages?.length ?? previousMessageCount.value
    const newLength = newMessages.length
    const prependedMessages =
      newLength > oldLength &&
      oldMessages &&
      newMessages[newLength - 1]?.id === oldMessages[oldLength - 1]?.id

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
  <div
    class="p-2 mb-2 hide-scrollbar overflow-auto d-flex flex-column"
    ref="messageListRef"
    @scroll="handleScroll"
  >
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
      class="mb-2 me-2 animate__animated animate__zoomIn"
      @image-click="openFullscreen"
    />

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
