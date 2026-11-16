import { bus } from '@/lib/bus'
import type { OutageCause } from '@/lib/connectivity'

interface UmamiInstance {
  identify: (id?: string | Record<string, unknown>, data?: Record<string, unknown>) => void
  track: (...args: unknown[]) => void
}

declare global {
  interface Window {
    umami?: UmamiInstance
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

  const script = document.createElement('script')
  script.src = `${__APP_CONFIG__.UMAMI_URL}/script.js`
  script.setAttribute('data-website-id', __APP_CONFIG__.UMAMI_WEBSITE_ID)
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
