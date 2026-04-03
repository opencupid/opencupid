import { ref } from 'vue'

type PanelId = 'browse' | 'user'

const activePanel = ref<PanelId | null>(null)

/**
 * Shared singleton state that enforces only one offcanvas panel open at a time.
 * Opening one panel automatically closes the other.
 */
export function useOffcanvasState() {
  function open(panel: PanelId) {
    activePanel.value = panel
  }

  function close() {
    activePanel.value = null
  }

  function isOpen(panel: PanelId): boolean {
    return activePanel.value === panel
  }

  return { activePanel, open, close, isOpen }
}
