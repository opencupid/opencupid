<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { bus } from '@/lib/bus'
import { useToast } from 'vue-toastification'

const router = useRouter()

import MessageReceivedToast from './MessageReceivedToast.vue'
import { type MessageDTO } from '@zod/messaging/messaging.dto'

const toast = useToast()

function handleMessageReceived({ message }: { message: MessageDTO }) {
  toast(
    {
      component: MessageReceivedToast,
      props: {
        toastId: `${message.id}`,
        message: message,
      },
    },
    {
      onClick: closeToast => {
        console.log('Toast clicked:', message.id)
        router.push({ name: 'Messaging', params: { conversationId: message.conversationId },force: true })
        closeToast()
      },
    }
  )
}
onMounted(() => {
  bus.on('message:received', handleMessageReceived)
})
onUnmounted(() => {
  bus.off('message:received', handleMessageReceived)
})
</script>
<template>
  <div></div>
</template>
