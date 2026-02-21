import { useWebSocket } from '@vueuse/core'
import { bus } from '@/lib/bus'
import type { WSMessage } from '@zod/dto/websocket.dto'

let socket: ReturnType<typeof useWebSocket> | null = null

bus.on('auth:logout', () => {
  disconnectWebSocket()
})

export function connectWebSocket(token: string): void {
  const url = `${__APP_CONFIG__.WS_BASE_URL}/message?token=${token}`

  socket = useWebSocket(url, {
    immediate: true,
    autoReconnect: true,
    onConnected: () => {
      console.log('[WS] Connected')
    },
    onDisconnected: () => {
      console.warn('[WS] Connection closed.')
    },
    onMessage: (_ws, event) => {
      try {
        const data: WSMessage = JSON.parse(event.data)
        console.log('[WS] Received message:', data)
        switch (data.type) {
          case 'ws:new_like':
            bus.emit('ws:new_like')
            break
          case 'ws:new_message':
          case 'ws:new_match':
          case 'ws:app_notification':
            bus.emit(data.type, data.payload)
            break
          case 'ws:incoming_call':
          case 'ws:call_accepted':
          case 'ws:call_declined':
          case 'ws:call_cancelled':
            bus.emit(data.type, data.payload)
            break
          default:
            console.warn('[WS] Unknown message type:', data)
        }
      } catch (err) {
        console.error('WebSocket parse error:', err)
      }
    },
  })
}

export function disconnectWebSocket() {
  if (socket) {
    socket.close()
    socket = null
    console.log('[WS] Disconnected')
  }
}
