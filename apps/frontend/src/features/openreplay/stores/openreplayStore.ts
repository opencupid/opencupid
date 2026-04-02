import { defineStore } from 'pinia'
import { ref, shallowRef, watch } from 'vue'
import type Tracker from '@openreplay/tracker'
import { bus } from '@/lib/bus'
import { useAuthStore } from '@/features/auth/stores/authStore'

export const useOpenreplayStore = defineStore('openreplay', () => {
  const tracker = shallowRef<Tracker | null>(null)
  const enabled = ref(false)

  async function start() {
    const userId = useAuthStore().userId
    if (!userId) return

    const { OPENREPLAY_PROJECT_KEY, OPENREPLAY_INGEST_POINT } = __APP_CONFIG__
    if (!OPENREPLAY_PROJECT_KEY || !OPENREPLAY_INGEST_POINT) return

    const { default: TrackerClass } = await import('@openreplay/tracker')
    const instance = new TrackerClass({
      projectKey: OPENREPLAY_PROJECT_KEY,
      ingestPoint: OPENREPLAY_INGEST_POINT,
      privateMode: true,
    })
    instance.start()
    instance.setMetadata('environment', __APP_CONFIG__.NODE_ENV)
    instance.setUserID(userId)
    tracker.value = instance
  }

  function teardown() {
    tracker.value?.setUserID('')
    tracker.value = null
  }

  watch(enabled, (value) => {
    if (value) {
      start()
    } else {
      teardown()
    }
  })

  return { tracker, enabled, teardown }
})

bus.on('auth:logout', () => {
  const store = useOpenreplayStore()
  store.enabled = false
})
