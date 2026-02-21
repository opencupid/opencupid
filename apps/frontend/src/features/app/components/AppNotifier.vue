<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { bus } from '@/lib/bus'
import { useToast } from 'vue-toastification'

const router = useRouter()

import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { type InteractionEdge } from '@zod/interaction/interaction.dto'

import ApiErrorOverlay from './ApiErrorOverlay.vue'
import LikeReceivedToast from './LikeReceivedToast.vue'
import MatchReceivedToast from './MatchReceivedToast.vue'
import MessageReceivedToast from './MessageReceivedToast.vue'
import IncomingCallToast from '@/features/videocall/components/IncomingCallToast.vue'

import { useI18n } from 'vue-i18n'
import { useCallStore } from '@/features/videocall/stores/callStore'

const toast = useToast()
const { t } = useI18n()
const callStore = useCallStore()

// API status overlay
const showApiOfflineOverlay = ref(false)

function toastId() {
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
      onClick: (closeToast) => {
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
      onClick: (closeToast) => {
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
      onClick: (closeToast) => {
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

function handleIncomingCall(payload: {
  conversationId: string
  roomName: string
  caller: { id: string; publicName: string }
}) {
  callStore.handleIncomingCall(payload)
  toast(
    {
      component: IncomingCallToast,
      props: {
        toastId: toastId(),
        callerName: payload.caller.publicName,
      },
    },
    {
      timeout: 30000,
      closeOnClick: false,
    }
  )
}

function handleApiOffline() {
  showApiOfflineOverlay.value = true
  // toast.error('Connection lost. Trying to reconnect...', {
  //   timeout: false,
  //   id: 'api-offline'
  // })
}

function handleApiOnline() {
  showApiOfflineOverlay.value = false
  // toast.dismiss('api-offline')
  // toast.success('Connection restored!', {
  //   timeout: 3000
  // })
}

onMounted(() => {
  bus.on('notification:new_message', handleMessageReceived)
  bus.on('ws:new_like', handleLikeReceived)
  bus.on('ws:new_match', handleMatchReceived)
  bus.on('ws:incoming_call', handleIncomingCall)
  bus.on('api:offline', handleApiOffline)
  bus.on('api:online', handleApiOnline)
  callStore.initialize()
})

onUnmounted(() => {
  bus.off('notification:new_message', handleMessageReceived)
  bus.off('ws:new_like', handleLikeReceived)
  bus.off('ws:new_match', handleMatchReceived)
  bus.off('ws:incoming_call', handleIncomingCall)
  bus.off('api:offline', handleApiOffline)
  bus.off('api:online', handleApiOnline)
  callStore.teardown()
})
</script>

<template>
  <slot> </slot>

  <ApiErrorOverlay
    :show="showApiOfflineOverlay"
    class="api-offline-overlay"
  />
</template>
<style scoped></style>
