import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/appStore'

/**
 * Composable to periodically check for frontend updates
 * Checks every 5 minutes and sets appStore.updateAvailable when an update is detected
 */
export function useUpdateChecker() {
  const appStore = useAppStore()
  let intervalId: NodeJS.Timeout | null = null

  const CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

  async function checkForUpdate() {
    const result = await appStore.checkUpdateAvailable()
    
    if (result.success && result.data?.updateAvailable) {
      console.log('Frontend update available:', result.data.latestVersion)
      // The UpdateBanner component will display the notification
      // and allow the user to reload when ready
    }
  }

  onMounted(() => {
    // Check immediately on mount
    checkForUpdate()
    
    // Then check periodically
    intervalId = setInterval(checkForUpdate, CHECK_INTERVAL)
  })

  onUnmounted(() => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  })

  return {
    checkForUpdate,
  }
}
