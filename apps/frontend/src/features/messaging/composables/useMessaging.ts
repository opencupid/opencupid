import { computed, ref } from 'vue'
import { useMessageStore } from '../stores/messageStore'

export function useMessaging() {

  const messageStore = useMessageStore()
  const errorMsg = ref('')

  return {
    errorMsg,
    isSending:messageStore.isSending,
    sendMessage: messageStore.sendMessage,
  }
}
