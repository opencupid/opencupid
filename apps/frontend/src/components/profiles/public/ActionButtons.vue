<script setup lang="ts">

import { inject, nextTick, ref } from 'vue'
import { type MessageDTO } from '@zod/messaging/messaging.dto'
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import SendMessage from '@/components/messaging/SendMessage.vue'
import IconMessage from '@/assets/icons/interface/message.svg'

const props = defineProps<{
  profile: PublicProfileWithContext
}>()
const isOwner = inject<boolean>('isOwner', false)
const isEditable = inject<boolean>('isEditable', false)

const emit = defineEmits<{
  (e: 'intent:message', profile: PublicProfileWithContext): void
  (e: 'intent:conversation:open', conversationId: string): void
}>()

const showMessageModal = ref(false)
const messageSent = ref(false)

const handleMessageSent = (message: MessageDTO | null) => {
  messageSent.value = true
  setTimeout(() => {
    showMessageModal.value = false
  }, 3000)
  if (message) {
    console.log('Message sent:', message)
  } else {
    console.log('Message sending failed or was cancelled.')
  }
}

const messageInput = ref()
const handleModalShown = () => {
  nextTick(() => {
    setTimeout(() => {
      messageInput.value?.focusTextarea()
    }, 50)
  })
}

const handleMessageIntent = () => {
  if (!props.profile.conversation) {
    showMessageModal.value = true
    return
  }
  if (props.profile.conversation.status === 'ACCEPTED') {
    emit('intent:conversation:open', props.profile.conversation.id)
  }
}

</script>

<template>
  <div>
    <div>
      <BButton
        v-if="(!profile.conversation || profile.conversation.status === 'ACCEPTED') && !isOwner"
        :pill="true"
        class="btn-overlay"
        @click="handleMessageIntent"
      >
        <IconMessage class="svg-icon-lg p-0" />
        <!-- {{ $t('profiles.send_message_button') }} -->
      </BButton>
    </div>

    <BModal
      v-model="showMessageModal"
      title=""
      size="md"
      :backdrop="'static'"
      centered
      :no-close-on-backdrop="true"
      :no-header="messageSent"
      :no-footer="true"
      initial-animation
      body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden"
      :keyboard="false"
      @shown="handleModalShown"
      @hidden="
        () => {
          messageSent = false
        }
      "
    >
      <template #title>
        <h6 class="d-flex align-items-center m-0" v-if="!messageSent">
          <ProfileThumbnail :profile="profile" class="me-2" />
          {{
            $t('messaging.send_message_to_user', {
              name: profile.publicName || 'them',
            })
          }}
        </h6>
      </template>
      <div class="w-100">
        <div v-if="!messageSent">
          <SendMessage
            ref="messageInput"
            :recipientProfile="profile"
            :conversationId="null"
            @close="showMessageModal = false"
            @message:sent="handleMessageSent"
          />
        </div>
        <div v-else>
          <div
            class="d-flex flex-column align-items-center justify-content-center h-100 text-success"
          >
            <div class="my-4 animate__animated animate__zoomIn" style="height: 5rem">
              <IconMessage class="svg-icon-lg h-100 w-100" />
            </div>
            <h5 class="mb-4 text-center animate__animated animate__fadeInDown">
              {{ $t('messaging.message_sent_success') }}
            </h5>
          </div>
        </div>
      </div>
    </BModal>
  </div>
</template>

<style scoped></style>
