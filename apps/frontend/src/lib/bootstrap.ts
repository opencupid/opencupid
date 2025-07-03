import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bus } from './bus'
import { connectWebSocket } from './websocket'

import { useAuthStore } from '../features/auth/stores/authStore'
import { useFindProfileStore } from '../features/browse/stores/findProfileStore'
import { useInteractionStore } from '../features/interaction/stores/useInteractionStore'
import { useMessageStore } from '../features/messaging/stores/messageStore'
import { useOwnerProfileStore } from '../features/myprofile/stores/ownerProfileStore'
import { useLocalStore } from '../store/localStore'

export const useBootstrap = defineStore('bootstrap', () => {

  const bootstrapPromise = ref<Promise<void> | null>(null)
  const isBootstrapped = ref(false)

  async function bootstrap() {

    if (bootstrapPromise.value) return bootstrapPromise.value

    bootstrapPromise.value = (async () => {

      const localStore = useLocalStore()
      localStore.initialize()

      const authStore = useAuthStore()
      authStore.initialize()

      const ownerProfileStore = useOwnerProfileStore()
      const messagingStore = useMessageStore()
      const interactionStore = useInteractionStore()

      await Promise.all([
        ownerProfileStore.fetchOwnerProfile(),
      ])

      isBootstrapped.value = true

      connectWebSocket(authStore.jwt)
      messagingStore.initialize()
      interactionStore.initialize()
    })()

    return bootstrapPromise.value
  }

  async function onLogin() {
    isBootstrapped.value = false
    bootstrapPromise.value = null
    await bootstrap()
  }

  return { bootstrap, onLogin }
})

bus.on('auth:login', async ({ token }) => {
  await useBootstrap().onLogin()
})
