import { useWebSocket } from '@vueuse/core'
import { bus } from '@/lib/bus'
import { api } from '@/lib/api'
import type { WSMessage } from '@zod/dto/websocket.dto'
import type { WsTicketResponse } from '@zod/apiResponse.dto'

let socket: ReturnType<typeof useWebSocket> | null = null
let ticketUrl = ''
let isIntentionalClose = false

bus.on('auth:logout', () => {
  disconnectWebSocket()
})

async function fetchTicketUrl(): Promise<boolean> {
  try {
    const res = await api.get<WsTicketResponse>('/auth/ws-ticket')
    ticketUrl = `${__APP_CONFIG__.WS_BASE_URL}/message?ticket=${res.data.ticket}`
    return true
  } catch (err) {
    console.warn('[WS] Failed to fetch ticket')
    return false
  }
}

export async function connectWebSocket(): Promise<void> {
  disconnectWebSocket()
  isIntentionalClose = false

  const fetched = await fetchTicketUrl()
  if (!fetched) return

  socket = useWebSocket(() => ticketUrl, {
    immediate: true,
    autoReconnect: {
      retries: 3,
      delay: 3000,
    },
    onConnected: () => {
      console.log('[WS] Connected')
    },
    onDisconnected: () => {
      console.warn('[WS] Connection closed.')
      if (!isIntentionalClose) {
        fetchTicketUrl()
      }
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
  isIntentionalClose = true
  if (socket) {
    socket.close()
    socket = null
    console.log('[WS] Disconnected')
  }
}
