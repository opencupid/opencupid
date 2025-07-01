import type { MessageDTO } from '@zod/messaging/messaging.dto'
import type { InteractionEdge } from '@zod/interaction/interaction.dto'

export type WSEvents = {
  'ws:new_message': MessageDTO
  'ws:new_like': void
  'ws:new_match': InteractionEdge
  'ws:app_notification': { title: string; body: string }
}