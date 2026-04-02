import mitt from 'mitt'
import type { WSEvents } from '@/types/wsBusEvents'
import type { MessageDTO } from '@zod/messaging/messaging.dto'

type AppEvents = {
  'auth:login': { token: string }
  'openreplay:start': { userId: string | null }
  'auth:logout': void
  'auth:logged-out': void
  'auth:token-refreshed': { token: string }
  'notification:new_message': MessageDTO
  'language:changed': { language: string }
  'api:offline': void
  'api:online': void
  'profile:dating-prefs-updated': void
  'profile:blocked': { profileId: string }
}

type Events = AppEvents & WSEvents

export const bus = mitt<Events>()
