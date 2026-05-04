import { bus } from '@/lib/bus'

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
}
