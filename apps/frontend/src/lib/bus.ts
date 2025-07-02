import mitt from 'mitt'
import type { JwtPayload } from '@zod/user/user.types'
import type { WSEvents } from '@/types/wsBusEvents'
import type { MessageDTO } from '@zod/messaging/messaging.dto'

type AppEvents = {
  'auth:login': { token: string }
  'auth:logout': void
  'notification:new_message': MessageDTO
  'language:changed': { language: string }
}

type Events = AppEvents & WSEvents

export const bus = mitt<Events>()
