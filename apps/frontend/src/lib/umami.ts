import { bus } from '@/lib/bus'

declare global {
  interface Window {
    umami?: {
      identify: (id?: string | Record<string, unknown>, data?: Record<string, unknown>) => void
      track: (...args: unknown[]) => void
    }
  }
}

const enabled = Boolean(__APP_CONFIG__.UMAMI_URL && __APP_CONFIG__.UMAMI_WEBSITE_ID)

export function initUmami() {
  if (!enabled) return

  const script = document.createElement('script')
  script.defer = true
  script.src = `${__APP_CONFIG__.UMAMI_URL}/script.js`
  script.setAttribute('data-website-id', __APP_CONFIG__.UMAMI_WEBSITE_ID)
  script.setAttribute('data-performance', 'true')
  document.head.appendChild(script)
}

// Umami loads with `defer`, so window.umami may not exist yet when an
// auth:login fires very early (e.g. cookie-restore on page reload runs
// before the script tag is appended in main.ts). Programmatic identify()
// must wait for the global. Poll briefly, then give up.
function whenUmamiReady(fn: (umami: NonNullable<Window['umami']>) => void) {
  if (!enabled) return
  const start = Date.now()
  const tick = () => {
    if (window.umami?.identify) {
      fn(window.umami)
      return
    }
    if (Date.now() - start > 5000) return
    setTimeout(tick, 100)
  }
  tick()
}

export function identifyUmami(userId: string) {
  // Pass userId as session data, not as the unique ID. Calling identify(userId)
  // makes Umami pivot the sessionId hash from (ip+ua+salt) to (userId), which
  // splits the visit into separate "session" rows in the dashboard — anonymous
  // events on /auth become one row, post-login events become another. Passing
  // a data-only object keeps the same anonymous sessionId hash and attaches
  // userId as queryable session metadata, preserving continuity of the visit.
  whenUmamiReady((umami) => umami.identify({ user: userId }))
}

export function resetUmamiIdentity() {
  // Explicitly null out the `user` session-data key on logout so the post-logout
  // portion of the visit isn't still attributed to the previous user when
  // querying by session metadata.
  whenUmamiReady((umami) => umami.identify({ user: null }))
}

export const tracker = {
  track(eventName: string, data?: Record<string, unknown>) {
    whenUmamiReady((umami) => umami.track(eventName, data))
  },
}

if (enabled) {
  bus.on('auth:login', ({ userId }) => {
    if (userId) identifyUmami(userId)
  })

  bus.on('auth:logged-out', () => {
    resetUmamiIdentity()
  })
}
