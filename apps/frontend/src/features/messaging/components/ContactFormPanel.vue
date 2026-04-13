<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watchEffect } from 'vue'
import { useElementSize } from '@vueuse/core'

import type { MessageRecipient } from '@zod/profile/profile.dto'
import type { ConversationContext } from '@zod/interaction/interactionContext.dto'
import type { MessageDTO } from '@zod/messaging/messaging.dto'

import SendMessageForm from './SendMessageForm.vue'
import MessageBubble from './MessageBubble.vue'
import IconMessage from '@/assets/icons/interface/message.svg'
import { useMessageSentState } from '@/features/publicprofile/composables/useMessageSentState'
import { useMessageStore } from '../stores/messageStore'

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

const props = withDefaults(
  defineProps<{
    recipientProfile: MessageRecipient & Partial<ConversationContext>
    showTags?: boolean
    noResize?: boolean
  }>(),
  { showTags: false, noResize: true }
)

const isWaitingForReply =
  props.recipientProfile.initiated === true && props.recipientProfile.canMessage === false

const messageStore = useMessageStore()
const sentMessages = ref<MessageDTO[]>([])

onMounted(async () => {
  if (!isWaitingForReply || !props.recipientProfile.conversationId) return
  const result = await messageStore.fetchMessages(props.recipientProfile.conversationId)
  if (result.success && result.data) {
    sentMessages.value = result.data.messages
  }
})

const emit = defineEmits<{
  (e: 'sent'): void
  (e: 'submitted'): void
}>()

const messageInput = ref<InstanceType<typeof SendMessageForm> | null>(null)

// Measure the form branch so the success branch can hold its height — the
// success UI (icon + one line of text) is much shorter than the form, and
// without a latched minHeight the outer wrapper would collapse on swap,
// jolting the modal layout. `useElementSize` tracks the form continuously
// while mounted (including textarea auto-growth); `latchedHeight` only
// copies non-zero values, so once the form unmounts and `formHeight` goes
// back to 0, the latch retains the last real measurement.
const formRef = useTemplateRef<HTMLElement>('formRef')
const { height: formHeight } = useElementSize(formRef)
const latchedHeight = ref(0)
watchEffect(() => {
  if (formHeight.value > 0) latchedHeight.value = formHeight.value
})

// Two-phase notification: `submitted` fires the instant the message is
// accepted by the server so parents can hide pre-send affordances (e.g. a
// "Maybe later" button) while the success state is visible. `sent` fires
// ~3s later via onCompleted, giving the success-state UI time to be seen
// before the parent reacts (e.g. closes a modal).
const { messageSent, handleMessageSent, resetMessageSent } = useMessageSentState({
  onCompleted: () => emit('sent'),
})

const onMessageSent = (message: Parameters<typeof handleMessageSent>[0]) => {
  emit('submitted')
  handleMessageSent(message)
}

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
  <div
    class="w-100 h-100 d-flex flex-column"
    :style="latchedHeight > 0 ? { minHeight: `${latchedHeight}px` } : undefined"
  >
    <!-- 1. Transient success confirmation after a fresh send -->
    <div
      v-if="messageSent"
      class="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-success"
    >
      <div
        class="p-2 w-100 opacity-75"
        style="height: 5rem"
      >
        <component
          :is="IconMessage"
          class="svg-icon-lg w-100 h-100"
        />
      </div>
      <h1 class="text-center mb-0">
        {{ $t('messaging.message_sent_success') }}
      </h1>
    </div>

    <!-- 2. Waiting for reply — viewer already initiated contact -->
    <div
      v-else-if="isWaitingForReply"
      class="flex-grow-1 d-flex flex-column align-items-center justify-content-center"
    >
      <div
        v-if="sentMessages.length"
        class="w-100 d-flex flex-column align-items-end px-2"
      >
        <MessageBubble
          v-for="msg in sentMessages"
          :key="msg.id"
          :message="msg"
          class="mb-2"
        />
      </div>
      <div class="form-hint mb-3">
        {{ $t('messaging.already_sent_waiting') }}
      </div>
    </div>

    <!-- 3. Default: pre-send form -->
    <div
      v-else
      ref="formRef"
    >
      <SendMessageForm
        ref="messageInput"
        :recipient-profile="recipientProfile"
        :conversation-id="null"
        :show-tags="showTags"
        :no-resize="noResize"
        @message:sent="onMessageSent"
      />
    </div>
  </div>
</template>
