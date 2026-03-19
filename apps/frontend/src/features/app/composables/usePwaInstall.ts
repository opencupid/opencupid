import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/appStore'
import type { BeforeInstallPromptEvent } from '@/types/pwa'

let deferredPrompt: BeforeInstallPromptEvent | null = null

export async function promptInstall() {
  if (!deferredPrompt) return

  const appStore = useAppStore()

  try {
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
  } catch (error) {
    // Avoid unhandled rejections and aid debugging if the prompt fails.
    console.error('PWA install prompt failed:', error)
  } finally {
    deferredPrompt = null
    appStore.canInstallPwa = false
  }
}

/**
 * Sets up beforeinstallprompt and appinstalled listeners.
 * Call once from App.vue — do not call from multiple components.
 */
export function usePwaInstall() {
  const appStore = useAppStore()

  function handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
    event.preventDefault()
    deferredPrompt = event
    appStore.canInstallPwa = true
  }

  function handleAppInstalled() {
    deferredPrompt = null
    appStore.canInstallPwa = false
  }

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })
}
