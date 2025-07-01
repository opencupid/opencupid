<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { bus } from '@/lib/bus'
import { useToast } from 'vue-toastification'

const router = useRouter()

import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { type InteractionEdge } from '@zod/interaction/interaction.dto'

import MessageReceivedToast from './MessageReceivedToast.vue'
import LikeReceivedToast from './LikeReceivedToast.vue'
import MatchReceivedToast from './MatchReceivedToast.vue'

const toast = useToast()

function toastId(){
  return new Date().getUTCMilliseconds()
}

function handleMessageReceived(message: MessageDTO) {
  toast(
    {
      component: MessageReceivedToast,
      props: {
        toastId: toastId(),
        message: message,
      },
    },
    {
      onClick: closeToast => {
        router.push({
          name: 'Messaging',
          params: { conversationId: message.conversationId },
          force: true,
        })
        closeToast()
      },
    }
  )
}

function handleLikeReceived() {
  toast(
    {
      component: LikeReceivedToast,
      props: {
        toastId: toastId(),
      },
    },
    {
      onClick: closeToast => {
        // router.push({ name: 'Messaging', params: { conversationId: message.conversationId },force: true })
        closeToast()
      },
    }
  )
}

function handleMatchReceived(edge: InteractionEdge) {
  console.log('Match received:', edge)
  toast(
    {
      component: MatchReceivedToast,
      props: {
        toastId: toastId(),
        edge,
      },
    },
    {
      onClick: closeToast => {
        router.push({
          name: 'Matches',
          params: { profileId: edge.profile.id },
          force: true,
        })
        closeToast()
      },
    }
  )
}

onMounted(() => {
  bus.on('notification:new_message', handleMessageReceived)
  bus.on('ws:new_like', handleLikeReceived)
  bus.on('ws:new_match', handleMatchReceived)
})

onUnmounted(() => {
  bus.off('notification:new_message', handleMessageReceived)
  bus.off('ws:new_like', handleLikeReceived)
  bus.off('ws:new_match', handleMatchReceived)
})
</script>

<template><slot/></template>