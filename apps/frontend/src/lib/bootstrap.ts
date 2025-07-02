import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '../features/auth/stores/authStore'
import { useOwnerProfileStore } from '../features/myprofile/stores/ownerProfileStore'
import { useMessageStore } from '../features/messaging/stores/messageStore'
import { useInteractionStore } from '../features/interaction/stores/useInteractionStore'
import { useLocalStore } from '../store/localStore'
import { connectWebSocket } from './websocket'
import { bus } from './bus'

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
