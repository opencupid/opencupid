import { useWebSocket } from '@vueuse/core'
import { bus } from '@/lib/bus'
import { api } from '@/lib/api'
import type { WSMessage } from '@zod/dto/websocket.dto'
import type { WsTicketResponse } from '@zod/apiResponse.dto'

let socket: ReturnType<typeof useWebSocket> | null = null
let ticketUrl = ''
let isIntentionalClose = false
let wasConnected = false

bus.on('auth:logout', () => {
  wasConnected = false
  disconnectWebSocket()
})

bus.on('api:online', async () => {
  // Reconnect WebSocket when the API comes back online after an outage,
  // unless the user explicitly logged out.
  if (!isIntentionalClose && socket?.status.value !== 'OPEN') {
    await connectWebSocket()
  }
})

bus.on('app:hidden', () => {
  if (wasConnected) {
    disconnectWebSocket()
  }
})

bus.on('app:visible', async () => {
  if (wasConnected && (!socket || socket.status.value !== 'OPEN')) {
    await connectWebSocket()
  }
})

async function fetchTicketUrl(): Promise<boolean> {
  try {
    const res = await api.get<WsTicketResponse>('/auth/ws-ticket')
    ticketUrl = `${__APP_CONFIG__.WS_BASE_URL}/message?ticket=${res.data.ticket}`
    return true
  } catch (err) {
    console.warn('[WS] Failed to fetch ticket', err)
    return false
  }
}

export async function connectWebSocket(): Promise<void> {
  disconnectWebSocket()
  isIntentionalClose = false

  const fetched = await fetchTicketUrl()
  if (!fetched) return

  // The WebSocket constructor can throw synchronously in some browser contexts
  // (notably WebKit on iOS in Private Browsing or restricted WKWebView
  // contexts, which raises SecurityError code 18). Swallow the throw so the
  // rest of the app keeps working — visibility/online reconnect paths will
  // retry on their own.
  try {
    socket = useWebSocket(() => ticketUrl, {
      immediate: true,
      autoReconnect: {
        retries: 3,
        delay: 3000,
      },
      onConnected: () => {},
      onDisconnected: () => {
        console.warn('[WS] Connection closed.')
        if (!isIntentionalClose) {
          fetchTicketUrl()
        }
      },
      onMessage: (_ws, event) => {
        try {
          const data: WSMessage = JSON.parse(event.data)
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
    wasConnected = true
  } catch (err) {
    console.warn('[WS] Failed to open WebSocket', err)
    socket = null
    wasConnected = false
  }
}

export function disconnectWebSocket() {
  isIntentionalClose = true
  if (socket) {
    socket.close()
    socket = null
  }
}
