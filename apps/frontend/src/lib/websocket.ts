import { useWebSocket } from '@vueuse/core'
import { bus } from '@/lib/bus'
import type { WSMessage } from '@zod/websocket.dto'

let socket: ReturnType<typeof useWebSocket> | null = null


bus.on('auth:logout', () => {
  disconnectWebSocket()
})

export function connectWebSocket(token: string): void {
  const url = `${__APP_CONFIG__.WS_BASE_URL}/message?token=${token}`

  socket = useWebSocket(url, {
    immediate: true,
    autoReconnect: true,
  })

  socket.ws.value?.addEventListener('message', (event: MessageEvent) => {
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
        default:
          console.warn('[WS] Unknown message type:', data)
      }
    } catch (err) {
      console.error('WebSocket parse error:', err)
    }
  })

  socket.ws.value?.addEventListener('close', () => {
    console.warn('[WS] Connection closed.')
  })

  console.log('[WS] Connected:', socket.ws.value)
}

export function disconnectWebSocket() {
  if (socket?.ws.value) {
    socket.ws.value.close()
    socket = null
    console.log('[WS] Disconnected')
  }
}
