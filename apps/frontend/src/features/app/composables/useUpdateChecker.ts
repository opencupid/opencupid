import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/appStore'

const BASE_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MAX_INTERVAL = 30 * 60 * 1000 // 30 minutes

/**
 * Composable to periodically check for frontend updates.
 * Checks every 5 minutes and sets appStore.updateAvailable when an update is detected.
 * Uses exponential backoff on consecutive failures (capped at 30 min).
 */
export function useUpdateChecker() {
  const appStore = useAppStore()
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let failureCount = 0

  function getNextDelay(): number {
    return Math.min(BASE_INTERVAL * Math.pow(2, failureCount), MAX_INTERVAL)
  }

  function scheduleNextCheck() {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(checkForUpdate, getNextDelay())
  }

  async function checkForUpdate() {
    try {
      const result = await appStore.checkUpdateAvailable()

      if (result.success) {
        failureCount = 0
        if (result.data?.updateAvailable) {
          console.log('Frontend update available:', result.data.latestVersion)
        }
      } else {
        failureCount++
      }
    } catch {
      failureCount++
    }

    scheduleNextCheck()
  }

  onMounted(() => {
    checkForUpdate()
  })

  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  })

  return {
    checkForUpdate,
  }
}
