import type { Brand } from '@/lib/brand'
import { logger } from '@/lib/logger'

/**
 * Umami's /api/send drops any event whose user agent `isbot()` matches. The
 * caller's user agent goes in the event data instead, so events about bots
 * (the point of server-side events) are kept.
 */
const SERVER_USER_AGENT = 'Mozilla/5.0 (compatible; OpenCupid)'

export type UmamiEvent = {
  name: string
  /** Path the event is attributed to. */
  url: string
  data: Record<string, string | number | boolean>
  /** Client IP, so Umami's session and geo describe the caller, not this server. */
  ip?: string
}

/** Sends an event to the brand's Umami site. A no-op when analytics is off; never throws. */
export async function sendUmamiEvent(brand: Brand, event: UmamiEvent): Promise<void> {
  if (!brand.umami) return
  try {
    const res = await fetch(`${brand.umami.url}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': SERVER_USER_AGENT },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: brand.umami.websiteId,
          hostname: brand.domain,
          url: event.url,
          name: event.name,
          data: event.data,
          ...(event.ip && { ip: event.ip }),
        },
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) logger.warn({ status: res.status, event: event.name }, 'umami event rejected')
  } catch (err) {
    logger.warn({ err, event: event.name }, 'umami event failed')
  }
}
