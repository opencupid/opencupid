<template>
  <div class="container mt-3">
    <h2 class="mb-3">Messaging</h2>
    <!-- TODO implement left sidebar with user list. user items should be clickable  -->
    <div class="mb-2">
      <input v-model="recipient"
             class="form-control mb-2"
             placeholder="Recipient user id" />
      <div class="border p-2 mb-2"
           style="height: 200px; overflow-y: auto;">
        <div v-for="msg in messages"
             :key="msg.id"
             class="mb-1">
          <strong>{{ msg.from === authStore.getUserId ? 'Me' : 'Them' }}:</strong>
          {{ msg.content }}
        </div>
      </div>
      <div class="input-group">
        <input v-model="text"
               class="form-control"
               placeholder="Type a message"
               @keyup.enter="sendMessage" />
        <button class="btn btn-primary"
                @click="sendMessage">Send</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useWebSocket } from '@vueuse/core'
import { useAuthStore } from '@/store/authStore'

interface WsMessage {
  id?: string
  from: string
  content: string
  createdAt?: string
}

const authStore = useAuthStore()
const recipient = ref('')
const text = ref('')
const messages = ref<WsMessage[]>([])

const url = `${__APP_CONFIG__.WS_BASE_URL}/message?token=${authStore.jwt}`
const { ws, data, send, open, close } = useWebSocket(url, {
  immediate: true,
  autoReconnect: true,
  heartbeat: {
    message: JSON.stringify({ type: 'ping' }),
    interval: 10000,
    pongTimeout: 10000,
  },
})

if (ws.value) {
  ws.value.addEventListener('message', (e) => {
    console.log('WebSocket message received:', e.data)
    const parsed = JSON.parse(e.data)
    if (parsed.type === 'pong') {
      return
    }
    const data = parsed as WsMessage
    messages.value.push(data)
  })
}

function sendMessage() {
  if (!recipient.value || !text.value) return
  send(JSON.stringify({ to: recipient.value, content: text.value }))
  messages.value.push({ from: authStore.getUserId || '', content: text.value })
  text.value = ''
}
</script>
