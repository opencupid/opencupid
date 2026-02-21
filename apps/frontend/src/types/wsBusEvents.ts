import type { MessageDTO } from '@zod/messaging/messaging.dto'
import type { InteractionEdge } from '@zod/interaction/interaction.dto'

export type WSEvents = {
  'ws:new_message': MessageDTO
  'ws:new_like': void
  'ws:new_match': InteractionEdge
  'ws:app_notification': { title: string; body: string }
  'ws:incoming_call': {
    conversationId: string
    roomName: string
    caller: { id: string; publicName: string }
  }
  'ws:call_accepted': { conversationId: string; roomName: string }
  'ws:call_declined': { conversationId: string }
  'ws:call_cancelled': { conversationId: string }
}
