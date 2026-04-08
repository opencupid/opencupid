<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue'
import type { PublicPostWithProfile, OwnerPost } from '@zod/post/post.dto'

import PostCard from './PostCard.vue'
import SendMessageForm from '@/features/messaging/components/SendMessageForm.vue'
import IconMessage from '@/assets/icons/interface/message.svg'
import IconCross from '@/assets/icons/interface/cross.svg'

import { useMessageSentState } from '@/features/publicprofile/composables/useMessageSentState'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps<{
  post: PublicPostWithProfile | OwnerPost
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', post: PublicPostWithProfile | OwnerPost): void
  (e: 'hide', post: PublicPostWithProfile | OwnerPost): void
  (e: 'delete', post: PublicPostWithProfile | OwnerPost): void
}>()

const showMessageForm = ref(false)
const messageInput = ref()
const { messageSent, handleMessageSent, resetMessageSent } = useMessageSentState()

const recipientProfile = computed(() => props.post.postedBy)

const handleContact = async () => {
  resetMessageSent()
  showMessageForm.value = true
  await nextTick()
  messageInput.value?.focusTextarea?.()
}

watch(
  () => props.post.id,
  () => {
    showMessageForm.value = false
    resetMessageSent()
  }
)

const closeDetailPanel = inject<(() => void) | null>('detailPanelClose', null)
const handleBack = () => {
  if (closeDetailPanel) closeDetailPanel()
  else router.replace({ name: 'Browse' })
}
</script>

<template>
  <div class="w-100">
    <div class="d-flex justify-content-end align-items-center w-100">
      <button
        type="button"
        class="btn btn-shaded"
        :title="$t('profiles.back_button_title')"
        :aria-label="$t('profiles.back_button_title')"
        @click="handleBack"
      >
        <IconCross class="svg-icon" />
      </button>
    </div>
    <PostCard
      :post="post"
      :show-details="true"
      class="pt-5"
      :class="{ details: true }"
      @contact="handleContact"
      @edit="emit('edit', post)"
      @hide="emit('hide', post)"
      @delete="emit('delete', post)"
    />

    <div class="mt-3 p-2">
      <div v-if="!messageSent">
        <SendMessageForm
          ref="messageInput"
          :recipient-profile="recipientProfile"
          :conversation-id="null"
          @message:sent="handleMessageSent"
        />
      </div>
      <div
        v-else
        class="d-flex flex-column align-items-center justify-content-center h-100 text-success"
      >
        <div
          class="my-4 animate__animated animate__zoomIn"
          style="height: 5rem"
        >
          <IconMessage class="svg-icon-lg h-100 w-100" />
        </div>
        <h5 class="mb-4 text-center animate__animated animate__fadeInDown">
          {{ $t('messaging.message_sent_success') }}
        </h5>
      </div>
    </div>
  </div>
</template>
