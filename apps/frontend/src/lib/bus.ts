import mitt from 'mitt'
import type { WSEvents } from '@/types/wsBusEvents'
import type { MessageDTO } from '@zod/messaging/messaging.dto'

type AppEvents = {
  'auth:login': { token: string }
  'auth:logout': void
  'auth:token-refreshed': { token: string; refreshToken: string }
  'notification:new_message': MessageDTO
  'language:changed': { language: string }
  'api:offline': void
  'api:online': void
  'app:updateavailable': void
}

type Events = AppEvents & WSEvents

export const bus = mitt<Events>()
