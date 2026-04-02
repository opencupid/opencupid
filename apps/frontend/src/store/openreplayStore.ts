import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type Tracker from '@openreplay/tracker'
import { bus } from '@/lib/bus'
import { useAuthStore } from '@/features/auth/stores/authStore'

export const useOpenreplayStore = defineStore('openreplay', () => {
  const tracker = shallowRef<Tracker | null>(null)

  async function start(userId: string) {
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

  function initialize() {
    bus.on('openreplay:start', () => {
      const userId = useAuthStore().userId
      if (userId) {
        start(userId)
      }
    })
  }

  function teardown() {
    tracker.value?.setUserID('')
    tracker.value = null
  }

  return { tracker, initialize, teardown }
})

bus.on('auth:logout', () => {
  useOpenreplayStore().teardown()
})
