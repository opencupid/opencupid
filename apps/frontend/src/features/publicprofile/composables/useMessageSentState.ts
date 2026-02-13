import { onBeforeUnmount, ref } from 'vue'
import type { MessageDTO } from '@zod/messaging/messaging.dto'

interface UseMessageSentStateOptions {
  delayMs?: number
  onCompleted?: (message: MessageDTO | null) => void
}

export function useMessageSentState(options: UseMessageSentStateOptions = {}) {
  const { delayMs = 3000, onCompleted } = options
  const messageSent = ref(false)
  let timerId: ReturnType<typeof setTimeout> | null = null

  const handleMessageSent = (message: MessageDTO | null) => {
    messageSent.value = true

    if (timerId) {
      clearTimeout(timerId)
    }

    timerId = setTimeout(() => {
      onCompleted?.(message)
    }, delayMs)
  }

  const resetMessageSent = () => {
    messageSent.value = false
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
  }

  onBeforeUnmount(() => {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
  })

  return {
    messageSent,
    handleMessageSent,
    resetMessageSent,
  }
}
