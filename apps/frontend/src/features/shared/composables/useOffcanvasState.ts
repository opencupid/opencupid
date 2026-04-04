import { ref } from 'vue'

type PanelId = 'browse' | 'user'

const activePanel = ref<PanelId | null>(null)
const userPanel = ref<'profile' | 'inbox'>('profile')
const userConversationId = ref<string | undefined>()

/**
 * Shared singleton state that enforces only one offcanvas panel open at a time.
 * Opening one panel automatically closes the other.
 */
export function useOffcanvasState() {
  function open(panel: PanelId) {
    activePanel.value = panel
  }

  function openUser(panel: 'profile' | 'inbox', conversationId?: string) {
    userPanel.value = panel
    userConversationId.value = conversationId
    activePanel.value = 'user'
  }

  function close() {
    activePanel.value = null
  }

  function isOpen(panel: PanelId): boolean {
    return activePanel.value === panel
  }

  return { activePanel, open, openUser, close, isOpen, userPanel, userConversationId }
}
