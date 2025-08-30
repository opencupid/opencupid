<script lang="ts" setup>
import { ref } from 'vue'

import { type InteractionEdgePair } from '@zod/interaction/interaction.dto'
import { type PublicProfileWithContext } from '@zod/profile/profile.dto'

import ProfileImage from '@/features/images/components/ProfileImage.vue'
import SendMessageForm from '@/features/messaging/components/SendMessageForm.vue'

const props = defineProps<{
  profile: PublicProfileWithContext
  match: InteractionEdgePair
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'messaged'): void
}>()
const messageSent = ref(false)
const handleMessageSent = () => {
  messageSent.value = true
  setTimeout(() => {
    console.log('Hiding modal after message sent')
    emit('messaged')
    emit('close')
  }, 3000)
}
</script>

<template>
  <BModal
    :model-value="show"
    size="md"
    fullscreen="md"
    centered
    :focus="false"
    :no-close-on-backdrop="true"
    :no-footer="true"
    :no-header="true"
    initial-animation
    content-class="bg-dating"
    body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden p-0"
    :keyboard="false"
    @hidden="messageSent = false"
  >
    <div class="w-100 p-5">
      <h1 class="text-center mb-4">
        <!-- It's a match! -->
        {{ $t('interactions.its_a_match') }}
      </h1>
      <div class="d-flex flex-row align-items-center justify-content-center mb-4">
        <div class="image-wrapper">
          <ProfileImage :profile="match.from.profile" variant="thumb"/>
        </div>

        <div class="image-wrapper right">
          <ProfileImage :profile="match.to.profile" variant="thumb"/>
        </div>
      </div>
      <div v-if="profile.interactionContext.canMessage" class="text-center mb-4">
        <div v-if="!messageSent">
          <h5 class="text-center mb-3">
            <!-- send {them} a messages -->
            {{ $t('interactions.send_them_a_message', { name: profile.publicName }) }}
          </h5>
          <SendMessageForm
            ref="messageInput"
            :recipientProfile="profile"
            :conversationId="null"
            @message:sent="handleMessageSent"
          />
          <BButton class="btn btn-link text-decoration-none" @click="emit('close')">
            <!-- Maybe later -->
            {{ $t('interactions.cancel_button') }}
          </BButton>
        </div>
        <div v-else class="text-center">
          <!-- Nice -->
          {{ $t('interactions.message_confirmation') }}
        </div>
      </div>
    </div>
  </BModal>
</template>

<style scoped>
.image-wrapper {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.8);
}
.right {
  margin-left: -1.5rem;
  margin-right: 0;
}
</style>
