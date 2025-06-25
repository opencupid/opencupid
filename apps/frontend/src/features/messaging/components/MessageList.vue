<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{ messages: MessageDTO[] }>()

const messageListRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight
})

watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    messageListRef.value?.scrollTo({ top: messageListRef.value.scrollHeight })
  }
)
</script>

<template>
  <div class="p-2 mb-2 scrollable overflow-auto d-flex flex-column" ref="messageListRef">
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="message mb-2 me-2 message badge px-3 text-wrap rounded-pill fs-6 animate__animated animate__zoomIn user-select-none"
      :class="{
        'bg-info align-self-start': !msg.isMine,
        'bg-secondary align-self-end': msg.isMine,
      }"
    >
      {{ msg.content }}
    </div>
  </div>
</template>

<style scoped>
#message-list {
  --animate-duration: 200ms;
  --animate-delay: 0.9s;
}
</style>
