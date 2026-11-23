import { bus } from '@/lib/bus'
import type { OutageCause } from '@/lib/connectivity'

interface UmamiInstance {
  identify: (id?: string | Record<string, unknown>, data?: Record<string, unknown>) => void
  track: (...args: unknown[]) => void
}

declare global {
  interface Window {
    umami?: UmamiInstance
    umamiBeforeSend?: (type: string, payload: UmamiPayload) => UmamiPayload
  }
}

interface UmamiPayload {
  url?: string
  referrer?: string
  [key: string]: unknown
}

// Secrets that appear in our own URLs: the magic-link login token (query) and
// the signed unsubscribe token (path). Umami stores the full URL of every
// event and sends the previous page as the referrer on SPA navigations.
const SECRET_QUERY_KEYS = ['token']
const SECRET_PATHS = [/^(\/unsubscribe\/)[^/]+/]

/** `url` with login and unsubscribe tokens removed; other URLs unchanged. */
export function redactUrl(url: string): string {
  if (!url) return url
  let parsed: URL
  try {
    parsed = new URL(url, window.location.origin)
  } catch {
    return url
  }
  if (parsed.origin !== window.location.origin) return url
  const keys = SECRET_QUERY_KEYS.filter((key) => parsed.searchParams.has(key))
  const paths = SECRET_PATHS.filter((pattern) => pattern.test(parsed.pathname))
  if (!keys.length && !paths.length) return url
  for (const key of keys) parsed.searchParams.delete(key)
  for (const pattern of paths) parsed.pathname = parsed.pathname.replace(pattern, '$1:token')
  return url.startsWith('/') ? parsed.pathname + parsed.search + parsed.hash : parsed.toString()
}

/** Umami `data-before-send` hook: redacts the event's URL and referrer. */
function beforeSend(_type: string, payload: UmamiPayload): UmamiPayload {
  return {
    ...payload,
    ...(payload.url !== undefined && { url: redactUrl(payload.url) }),
    ...(payload.referrer !== undefined && { referrer: redactUrl(payload.referrer) }),
  }
}

const enabled = Boolean(__APP_CONFIG__.UMAMI_URL && __APP_CONFIG__.UMAMI_WEBSITE_ID)

let resolveReady!: (umami: UmamiInstance | undefined) => void
const ready = new Promise<UmamiInstance | undefined>((resolve) => {
  resolveReady = resolve
})

export function initUmami() {
  if (!enabled) {
    resolveReady(undefined)
    return
  }

  // The tracker looks the hook up on window by name, so it must exist first.
  window.umamiBeforeSend = beforeSend
  const script = document.createElement('script')
  script.src = `${__APP_CONFIG__.UMAMI_URL}/script.js`
  script.setAttribute('data-website-id', __APP_CONFIG__.UMAMI_WEBSITE_ID)
  script.setAttribute('data-before-send', 'umamiBeforeSend')
  script.setAttribute('data-performance', 'true')
  script.addEventListener('load', () => resolveReady(window.umami), { once: true })
  script.addEventListener('error', () => resolveReady(undefined), { once: true })
  document.head.appendChild(script)
}

export function identifyUmami(userId: string) {
  // Pass userId as session data, not as the unique ID. Calling identify(userId)
  // makes Umami pivot the sessionId hash from (ip+ua+salt) to (userId), which
  // splits the visit into separate "session" rows in the dashboard — anonymous
  // events on /auth become one row, post-login events become another. Passing
  // a data-only object keeps the same anonymous sessionId hash and attaches
  // userId as queryable session metadata, preserving continuity of the visit.
  ready.then((umami) => umami?.identify({ user: userId }))
}

export function resetUmamiIdentity() {
  // Explicitly null out the `user` session-data key on logout so the post-logout
  // portion of the visit isn't still attributed to the previous user when
  // querying by session metadata.
  ready.then((umami) => umami?.identify({ user: null }))
}

export const tracker = {
  track(eventName: string, data?: Record<string, unknown>) {
    ready.then((umami) => umami?.track(eventName, data))
  },
}

if (enabled) {
  bus.on('auth:login', ({ userId }) => {
    if (userId) identifyUmami(userId)
  })

  bus.on('auth:logged-out', () => {
    resetUmamiIdentity()
  })

  // Outage tracking: one `outage-api` and/or `outage-network` event per outage,
  // however often the diagnosed cause flips in between. An `outage-network`
  // event cannot leave the device while its connection is down, so it is held
  // back until the connection is known to work again.
  const counted = new Set<OutageCause>()
  let networkOutageUnsent = false

  const sendNetworkOutage = () => {
    if (!networkOutageUnsent) return
    networkOutageUnsent = false
    tracker.track('outage-network')
  }

  bus.on('api:offline', ({ cause }) => {
    const isNew = !counted.has(cause)
    counted.add(cause)

    if (cause === 'network') {
      if (isNew) networkOutageUnsent = true
      return
    }
    // Diagnosed as `api`: the device is connected.
    sendNetworkOutage()
    if (isNew) tracker.track('outage-api')
  })

  bus.on('api:online', () => {
    sendNetworkOutage()
    counted.clear()
  })
}
