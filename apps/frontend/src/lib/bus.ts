import mitt from 'mitt'
import type { WSEvents } from '@/types/wsBusEvents'
import type { MessageDTO } from '@zod/messaging/messaging.dto'

type AppEvents = {
  'auth:login': { token: string }
  'auth:logout': void
  'notification:new_message': MessageDTO
  'language:changed': { language: string }
  'api:offline': void
  'api:online': void
  // Detail view events
  'detail:profile:show': { id: string }
  'detail:profile:hide': void
  'detail:post:show': { id: string }
  'detail:post:hide': void
}

type Events = AppEvents & WSEvents

export const bus = mitt<Events>()
