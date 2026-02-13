<script setup lang="ts">
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{ messages: MessageDTO[] }>()

const messageListRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight
})

watch(
  () => props.messages,
  async () => {
    await nextTick()
    messageListRef.value?.scrollTo({ top: messageListRef.value.scrollHeight })
  },{
    deep: true,
  }
)
</script>

<template>
  <div class="p-2 mb-2 hide-scrollbar overflow-auto d-flex flex-column" ref="messageListRef">
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="message mb-2 me-2 pre-line text-wrap animate__animated animate__zoomIn user-select-none"
      :class="{
        'bg-info align-self-start': !msg.isMine,
        'bg-secondary align-self-end': msg.isMine,
      }"
      v-html="msg.content"
    />
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
