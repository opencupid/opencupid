import mitt from 'mitt'
import type { WSEvents } from '@/types/wsBusEvents'
import type { MessageDTO } from '@zod/messaging/messaging.dto'

type AppEvents = {
  'auth:login': { userId: string }
  // `expired` is set when the session died (refresh failed), as opposed to
  // the user logging out — only then is the current page worth returning to.
  'auth:logout': { expired: true } | undefined
  'auth:logged-out': { expired: boolean }
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
  'usercontent:mutated': void
}

type Events = AppEvents & WSEvents

export const bus = mitt<Events>()
