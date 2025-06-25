import { ref } from 'vue'
import { useMessageStore } from '../stores/messageStore'
import { type ProfileSummary } from '@zod/profile/profile.dto'

export function useMessaging() {

  const messageStore = useMessageStore()
  const isSending = ref(false)
  const isSent = ref(false)
  const errorMsg = ref('')

  async function sendMessage(conversationId: string, content: string) {
    if (!conversationId || !content) return
    isSending.value = true
    errorMsg.value = ''
    isSent.value = false

    try {
      const message = await messageStore.sendMessage(conversationId, content)
      isSent.value = true
      return message
    } catch (error) {
      console.error('Failed to send message:', error)
      // TODO i18n doesn't work in composables, this must be moved to parent
      errorMsg.value = 'Message not sent'//t('messaging.send_failed')
    } finally {
      isSending.value = false
    }
    return null
  }

  async function initiateConversation(recipient: ProfileSummary, content: string) {
    if (!recipient || !content) return
    isSending.value = true
    errorMsg.value = ''
    isSent.value = false

    try {
      const message = await messageStore.initiateConversation(recipient.id, content)
      isSent.value = true
      return message
    } catch (error) {
      console.error('Failed to send message:', error)
      // TODO i18n doesn't work in composables, this must be moved to parent
      errorMsg.value = 'Message not sent'//t('messaging.send_failed')
    } finally {
      isSending.value = false
    }
    return null
  }

  return {
    isSending,
    isSent,
    errorMsg,
    sendMessage,
    initiateConversation,
  }
}
