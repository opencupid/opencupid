import mitt from 'mitt'
import type { WSEvents } from '@/types/wsBusEvents'
import type { MessageDTO } from '@zod/messaging/messaging.dto'

type AppEvents = {
  'auth:login': { userId: string }
  'auth:logout': void
  'auth:logged-out': void
  'auth:token-refreshed': { token: string }
  'notification:new_message': MessageDTO
  'language:changed': { language: string }
  'api:offline': void
  'api:online': void
  'api:rate_limit': void
  'app:hidden': void
  'app:visible': void
  'profile:dating-prefs-updated': void
  'profile:blocked': { profileId: string }
}

type Events = AppEvents & WSEvents

export const bus = mitt<Events>()
