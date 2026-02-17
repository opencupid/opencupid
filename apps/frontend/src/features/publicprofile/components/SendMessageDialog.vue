<script setup lang="ts">
import { nextTick, ref } from 'vue'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import IconMessage from '@/assets/icons/interface/message.svg'
import ProfileThumbnail from '@/features/images/components/ProfileThumbnail.vue'
import SendMessageForm from '@/features/messaging/components/SendMessageForm.vue'
import { useMessageSentState } from '../composables/useMessageSentState'

const showModal = defineModel<boolean>()

const props = defineProps<{
  profile: PublicProfileWithContext
}>()

const emit = defineEmits<{
  (e: 'sent'): void
}>()

const messageInput = ref()
const { messageSent, handleMessageSent, resetMessageSent } = useMessageSentState({
  onCompleted: () => {
    showModal.value = false
    emit('sent')
  },
})

const handleModalShown = () => {
  nextTick(() => {
    setTimeout(() => {
      messageInput.value?.focusTextarea()
    }, 50)
  })
}
</script>

<template>
  <BModal
    v-model="showModal"
    title=""
    size="md"
    centered
    :no-header="messageSent"
    :no-footer="true"
    initial-animation
    body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden"
    :keyboard="false"
    @shown="handleModalShown"
    @hidden="
      () => {
        resetMessageSent()
      }
    "
  >
    <template #title>
      <h6
        class="d-flex align-items-center m-0"
        v-if="!messageSent"
      >
        <ProfileThumbnail
          :profile="profile"
          class="me-2"
        />
        {{
          $t('messaging.send_message_to_user', {
            name: profile.publicName || 'them',
          })
        }}
      </h6>
    </template>
    <div class="w-100">
      <div v-if="!messageSent">
        <SendMessageForm
          ref="messageInput"
          :recipientProfile="profile"
          :conversationId="null"
          @message:sent="handleMessageSent"
          showTags
        />
      </div>
      <div v-else>
        <div
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
  </BModal>
</template>
