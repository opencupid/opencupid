<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import type { MessageRecipient } from '@zod/profile/profile.dto'

import SendMessageForm from './SendMessageForm.vue'
import IconMessage from '@/assets/icons/interface/message.svg'
import { useMessageSentState } from '@/features/publicprofile/composables/useMessageSentState'

defineOptions({ name: 'ContactFormPanel' })

/**
 * Orchestrates the "initial contact" UX — encapsulates SendMessageForm and
 * the send → success-confirmation → reset state machine shared by PostCard,
 * SendMessageDialog, and MatchPopup. Parents own the containing element
 * (modal, inline wrapper, etc.) and react to the `sent` event to decide
 * what happens next (close modal, emit further, etc.).
 *
 * The success state fills the parent container (h-100 + flex centering),
 * so sizing is dictated by the consumer — no `size` prop.
 */

withDefaults(
  defineProps<{
    recipientProfile: MessageRecipient
    showTags?: boolean
    noResize?: boolean
  }>(),
  { showTags: false, noResize: true }
)

const emit = defineEmits<{
  (e: 'sent'): void
}>()

const messageInput = ref<InstanceType<typeof SendMessageForm> | null>(null)

// onCompleted fires ~3s after `message:sent`, giving the success-state UI
// time to be visible before the parent reacts (e.g. closes a modal).
const { messageSent, handleMessageSent, resetMessageSent } = useMessageSentState({
  onCompleted: () => emit('sent'),
})

// Reset on unmount so the ref is back to its initial state when the
// consumer re-mounts the panel (the composable only clears its timer
// on unmount, not the `messageSent` ref itself).
onBeforeUnmount(() => {
  resetMessageSent()
})

defineExpose({
  focusTextarea: () => messageInput.value?.focusTextarea(),
})
</script>

<template>
  <div class="w-100 h-100">
    <div v-if="!messageSent">
      <SendMessageForm
        ref="messageInput"
        :recipient-profile="recipientProfile"
        :conversation-id="null"
        :show-tags="showTags"
        :no-resize="noResize"
        @message:sent="handleMessageSent"
      />
    </div>
    <div
      v-else
      class="d-flex flex-column align-items-center justify-content-center h-100 text-success"
    >
      <div class="animate__animated animate__zoomIn p-2">
        <IconMessage class="svg-icon-lg" />
      </div>
      <h5 class="text-center animate__animated animate__fadeInDown mb-0">
        {{ $t('messaging.message_sent_success') }}
      </h5>
    </div>
  </div>
</template>
