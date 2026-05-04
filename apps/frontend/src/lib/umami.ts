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

let isLoaded: Promise<UmamiInstance | undefined>

export function useUmami() {
  function initUmami() {
    isLoaded = new Promise((resolve) => {
      if (!enabled) return resolve(undefined)

      const script = document.createElement('script')
      script.src = `${__APP_CONFIG__.UMAMI_URL}/script.js`
      script.setAttribute('id', 'u')
      script.setAttribute('data-website-id', __APP_CONFIG__.UMAMI_WEBSITE_ID)
      script.setAttribute('data-performance', 'true')
      document.head.appendChild(script)

      document.getElementById('u')?.addEventListener(
        'load',
        async () => {
          resolve(window.umami)
        },
        { once: true }
      )
    })
  }

  function identifyUmami(userId: string) {
    // Pass userId as session data, not as the unique ID. Calling identify(userId)
    // makes Umami pivot the sessionId hash from (ip+ua+salt) to (userId), which
    // splits the visit into separate "session" rows in the dashboard — anonymous
    // events on /auth become one row, post-login events become another. Passing
    // a data-only object keeps the same anonymous sessionId hash and attaches
    // userId as queryable session metadata, preserving continuity of the visit.
    isLoaded?.then((umami) => {
      if (umami) umami.identify({ user: userId })
    })
  }

  function resetUmamiIdentity() {
    // Explicitly null out the `user` session-data key on logout so the post-logout
    // portion of the visit isn't still attributed to the previous user when
    // querying by session metadata.
    isLoaded?.then((umami) => {
      if (umami) umami.identify({ user: null })
    })
  }

  function track(eventName: string, data?: Record<string, unknown>) {
    isLoaded?.then((umami) => {
      if (umami) umami.track(eventName, data)
    })
  }

  bus.on('auth:login', ({ userId }) => {
    if (userId) identifyUmami(userId)
  })

  bus.on('auth:logged-out', () => {
    resetUmamiIdentity()
  })

  return {
    initUmami,
    track,
  }
}
