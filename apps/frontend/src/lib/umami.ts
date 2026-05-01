import { bus } from '@/lib/bus'

declare global {
  interface Window {
    umami?: {
      // No-arg call clears the session identity per Umami's identify() API.
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
  whenUmamiReady((umami) => umami.identify(userId))
}

export function resetUmamiIdentity() {
  whenUmamiReady((umami) => umami.identify())
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
