import { defineStore } from 'pinia'
import { ref } from 'vue'
import Cookies from 'universal-cookie'
import { SESSION_COOKIE } from '@shared/session'
import { connectWebSocket } from './websocket'
import { bus } from './bus'

import { useInteractionStore } from '../features/interaction/stores/useInteractionStore'
import { useMessageStore } from '../features/messaging/stores/messageStore'
import { useOwnerProfileStore } from '../features/myprofile/stores/ownerProfileStore'
import { useUserStore } from '../store/userStore'

export const useBootstrap = defineStore('bootstrap', () => {
  // Singleton promise — subsequent calls to bootstrap() return the same promise
  // so that parallel callers (router guard, BrowseProfiles.onMounted, etc.) all wait
  // for the same fetch rather than firing duplicate requests.
  //
  // bootstrap() starts fire-and-forget at startup (lib/auth.ts, on auth:login).
  // The router guard awaits it only for a profile this device has not yet seen
  // onboarded (lib/onboardedHint.ts), so returning users' first paint never
  // waits on the profile fetch. Components that need the profile simply await
  // bootstrap() — if it's already resolved they get back instantly; if it's
  // still in-flight they join the existing promise.
  const bootstrapPromise = ref<Promise<void> | null>(null)
  const isBootstrapped = ref(false)

  async function bootstrap() {
    if (bootstrapPromise.value) return bootstrapPromise.value

    bootstrapPromise.value = (async () => {
      // localStore.initialize() now runs eagerly in main.ts, before the app
      // mounts, so the saved language preference is available immediately.

      // authStore.initialize() is intentionally NOT called here — it lives in
      // app.ts (cold-start path) and in authStore.verifyToken (hot-start path).
      // This keeps bootstrap.ts free of an authStore import, which would create
      // a circular dependency: authStore → bootstrap → authStore.
      if (!new Cookies().get(SESSION_COOKIE)) return

      const ownerProfileStore = useOwnerProfileStore()
      const messagingStore = useMessageStore()
      const interactionStore = useInteractionStore()

      await Promise.all([ownerProfileStore.fetchOwnerProfile(), useUserStore().fetchUser()])

      isBootstrapped.value = true

      connectWebSocket()
      messagingStore.initialize()
      interactionStore.initialize()
    })()

    return bootstrapPromise.value
  }

  // Called by authStore.verifyToken after a successful magic-link login.
  // Resets the singleton promise so bootstrap() re-fetches the profile for the
  // newly authenticated user. verifyToken awaits this before returning, which
  // guarantees the profile is in the store before router.push('/browse')
  // fires — preventing the race where the router guard reads a null profile.
  async function onLogin() {
    isBootstrapped.value = false
    bootstrapPromise.value = null
    await bootstrap()
  }

  function reset() {
    isBootstrapped.value = false
    bootstrapPromise.value = null
  }

  return { bootstrap, onLogin, reset }
})

// Reset the singleton so a subsequent login in the same app lifetime
// (without a full page reload) calls bootstrap() fresh rather than
// reusing a promise that resolved against a now-invalid session.
// Do NOT call onLogin() here — that re-runs bootstrap() immediately,
// which would attempt fetchOwnerProfile/connectWebSocket with an
// invalidated session before the cookie is cleared.
bus.on('auth:logout', () => {
  useBootstrap().reset()
})
